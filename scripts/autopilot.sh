#!/usr/bin/env bash
# Unattended build: relaunches Claude Code until PROGRESS.md says ALL_PHASES_DONE.
# State lives in git + PROGRESS.md, so every relaunch resumes where the last one stopped.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)"

LIMIT_WAIT=${LIMIT_WAIT:-900}   # seconds to sleep when the usage limit is hit
MAX_RUNS=${MAX_RUNS:-300}       # safety net against an endless loop
LOG_DIR=.autopilot; mkdir -p "$LOG_DIR"; LOG="$LOG_DIR/autopilot.log"
PROMPT='Autopilot run. Follow docs/BUILD_SPEC.md §0 and §11 exactly. Read PROGRESS.md, resume at the "Now:" line (or start Phase 1 if it does not exist). Work until the session ends; never ask questions.'

first_line() { head -n1 PROGRESS.md 2>/dev/null; }
log() { echo "$(date '+%F %T') $*" | tee -a "$LOG"; }

for ((run = 1; run <= MAX_RUNS; run++)); do
  git pull --ff-only -q 2>/dev/null || true
  case "$(first_line)" in
    ALL_PHASES_DONE*) log "All phases done."; exit 0 ;;
    BLOCKED*) log "Stopped: $(first_line)"; exit 1 ;;
  esac

  log "run $run starting"
  out=$(claude -p "$PROMPT" --dangerously-skip-permissions 2>&1); code=$?
  printf '%s\n' "$out" | tail -n 40 >> "$LOG"

  if printf '%s' "$out" | grep -qiE 'usage limit|limit reached|rate.?limit|resets? at|overloaded|529'; then
    log "usage limit hit — sleeping ${LIMIT_WAIT}s, then resuming"
    sleep "$LIMIT_WAIT"
  elif (( code != 0 )); then
    log "claude exited $code — retrying in 60s"
    sleep 60
  fi
done
log "MAX_RUNS reached without finishing — check PROGRESS.md"; exit 2
