---
name: automatic-agentic-run
description: Use when the user says "automatic agentic run", "automatic run" or "অটোমেটিক এজেন্টিক রান" — run every remaining phase of the repo's phased spec unattended - implement, verify with 100% merged coverage, fix until green, commit, push, CI-gate, merge, next phase, stop when all done.
---

# Automatic agentic run

Run all remaining phases of the project with no human in the loop. State lives only in git + `PROGRESS.md`; any session can be cut off and the next one resumes.

## 0. Locate the plan
- Spec: `docs/*SPEC*.md`, else `CLAUDE.md`, else `README.md`. Phases = its numbered phase list.
- `PROGRESS.md` at repo root. Missing → create: first line status, then `Now:` line, phase checklist, `Decisions`.
- First line of `PROGRESS.md` is the machine-read status: `ALL_PHASES_DONE <sha>` or `BLOCKED: …` or anything else (= running).

## 1. Preflight — all permissions first, then run (once per repo, before phase 1)
1. **Decide the full list.** Read the spec end to end and list every permission/tool any phase will touch: git push + branch create/delete, `gh` scopes (`repo`, `workflow`), Actions enabled, every MCP/connector named or implied (e.g. **Figma with write access** for design phases, Vercel, Supabase/Neon, Drive, Slack…), CLIs, runtimes, browsers for e2e, env secrets. Mark services that tests replace with fakes as "not required".
2. **Check each one for real** — a harmless live call, not just "is it installed": `git push --dry-run`, push + delete a `preflight-check` branch, `gh auth status`, `gh workflow list`; for MCPs call a read tool and, where write is needed, create + delete a scratch item (e.g. a Figma test page).
3. **Ask once.** Interactive: one message with a checklist of everything missing, exactly how to grant each, and what will be skipped if it is not granted. Wait for the answer, re-check. The user may decline any item — that is final for this run. Never ask for permissions again after the run starts.
4. **Declined (or missing in a headless run) = skip, don't stop.** Do all work that does not need it; do **not** do the work that needs it and do **not** invent a substitute unless the user asked for one. Log each in `PROGRESS.md › Skipped`: `<permission> — skipped: <tasks/phases>`. Effects on the loop:
   - no push → commit locally only, skip push/CI/merge-to-remote steps; gate = local verify.
   - no Actions/`gh` → gate = local verify only.
   - no MCP (e.g. Figma) → skip that phase/task, continue with the next.
   The 100% quality gate (§2) needs no permission and always applies.
5. Write `Preflight: done <date>` + checked list (granted / skipped) in `PROGRESS.md`. **Only now start phase 1.**

## 2. Mandatory quality gate (non-negotiable)
A phase is green only when **all** hold, locally and in CI:
- Merged unit + integration + e2e coverage = **100% lines, branches, functions, statements** over the whole source tree. e2e coverage collected from browser and server (V8) and merged with unit/integration (e.g. monocart-coverage-reports). Exclusions only for generated, migration, pure-type and config files, listed explicitly in coverage config.
- Zero TypeScript errors, zero lint warnings, zero a11y (axe) violations, zero console errors/warnings and zero failed network requests during e2e.
- Build succeeds.
If the repo lacks this setup (single `verify` script + CI workflow running the same script), build it as **phase 0** before anything else.

Never cheat to green: no `.skip`/`.only`, no `istanbul ignore`/`v8 ignore`, no weakened assertions, no lowered thresholds, no disabled lint rules or CI steps. Unreachable code is deleted. If a test is genuinely wrong, fix it and log why in `Decisions`.

## 3. Session start (every session)
1. `git status`, `git log -3`, read the top of `PROGRESS.md`.
2. Status line `ALL_PHASES_DONE` → report and stop. `BLOCKED` → report the reason and stop. No `Preflight: done` yet → do §1 first.
3. Resume exactly at `Now:`. Uncommitted work from a cut-off session: run tests, keep what passes, continue.

## 4. Per-phase loop
```
git switch -c phase/<n>-<name>            (or continue it)
implement with TDD → run verify
  red   → fix → verify                    (repeat)
  green → commit → push → gh run watch <id> --exit-status
            red   → gh run view <id> --log-failed → fix → commit → push → watch   (repeat)
            green → git switch main && git merge --ff-only phase/<n>-<name> && git push
                    tick phase in PROGRESS.md "phase <n> done <sha>" → commit → push
→ next phase
```
- Checkpoint: after each passing sub-step commit + push and update `Now:` (phase, step, next action). At most one step may be lost to a cutoff.
- Conventional Commits, small commits, never force-push, never commit secrets.
- External services: code against ports, tests use fakes; never block on real credentials.

## 5. BLOCKED rule
After 6 fix rounds on the same failure: write `BLOCKED: <phase> — <reason> — <what the human must do>` as line 1 of `PROGRESS.md`, commit, push, stop.

## 6. Finish
All phases green (skipped ones excluded) → `ALL_PHASES_DONE <sha>` as line 1, commit, push (if allowed), stop. Final report ≤10 lines: phases, coverage, CI link, **what was skipped and which permission would unlock it**, decisions worth reading.

## 7. Token economy
Read files narrowly (grep → line ranges), edit don't rewrite, run affected tests while iterating and the full gate at phase end, no narration, no restating code, report ≤10 lines per phase.

## 8. Usage-limit auto-resume
For fully unattended runs, use `scripts/autopilot.sh` (copy it into the repo if missing): it relaunches `claude -p "automatic agentic run"` until line 1 is `ALL_PHASES_DONE` or `BLOCKED`, sleeping and retrying when the usage limit is hit. Run it inside tmux on a dedicated machine/VPS (it uses `--dangerously-skip-permissions`).
