# Root-Logic-Commerce
Configurable e-commerce for small businesses — by Root Logic Lab.

- Build spec (single source of truth): [`docs/BUILD_SPEC.md`](docs/BUILD_SPEC.md)
- Earlier build, kept as reference only: [`legacy/README.md`](legacy/README.md)

Start the build with Claude Code: `Read docs/BUILD_SPEC.md and start Phase 1.`

## Run unattended (all phases, auto commit/push, auto-resume after usage limits)
Requirements on the machine: `claude` (logged in), `git` with push access, `gh` logged in (`gh auth login`), Node 22 + pnpm.
```bash
git switch main && git pull
tmux new -s build './scripts/autopilot.sh'   # detach: Ctrl-b d · logs: .autopilot/autopilot.log
```
First run interactively once (`claude`, then "Run the §11 preflight") so it asks for any missing git/GitHub access in one go.
It stops by itself when `PROGRESS.md` starts with `ALL_PHASES_DONE`, or with `BLOCKED: …` if it needs you.
Runs with `--dangerously-skip-permissions` — use a dedicated machine/VPS/container, not your personal laptop.
