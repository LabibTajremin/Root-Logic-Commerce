# Root Logic Commerce — agent notes
Spec: `docs/BUILD_SPEC.md` (read the § you need, not all). Progress/state: `PROGRESS.md` (line 1 = status, `Now:` = resume point).
Next (v2, not started): `docs/BUILD_SPEC_V2.md` — Figma redesign first, then features; gap list `docs/COMPETITOR_GAP_REPORT.md`.
Unattended runs: `.claude/skills/automatic-agentic-run/SKILL.md`.

## Rules (spec §0, short)
- Read narrowly (grep → line ranges); edit, don't rewrite; terse output; no speculative code.
- Comments only for non-obvious *why*. Named exports (Next route files excepted). No `any`.
- TDD. Never cheat to green (no skip/only/ignore comments/lowered thresholds).
- Git: one work branch + PR → `main`; never push to `main`. Conventional Commits, small commits, push after each.
- New deps must justify size + need. Secrets only in env; ship `.env.example`.

## Stack (spec §2)
Next.js 16 App Router (TS strict, `output: standalone`) · PostgreSQL 16 + Drizzle · Zod · Better Auth · Tailwind v4 (CSS-var tokens) · shadcn/ui · @dnd-kit/sortable · sharp · Vitest + Testing Library + PGlite · Playwright · pnpm · Node 22.

## Folder map (spec §4)
- `src/app/(storefront)` public · `src/app/admin` admin · `src/app/api` webhooks/cron/media/beacon
- `src/modules/<capability>/{domain,application,index.ts}` — domain/application import no Next/Drizzle/other-module internals
- `src/infrastructure/{db,storage,notify,auth}` adapters · `src/server/{container,tenant,config}.ts`
- `src/themes/{_contract.ts,registry.gen.ts,<theme>/}` · `src/ui` · `src/help` · `src/i18n`
- `tests/{integration,e2e,fixtures}` · `design/` (Figma link + notes) · `deploy/`

## Commands
- `pnpm verify` — THE gate (lint+prettier, typecheck, unit+integration coverage, build, coverage build + e2e, merged 100% coverage). CI runs the same.
- `pnpm test` / `pnpm vitest related <file>` — fast loop · `pnpm e2e` — Playwright (needs `pnpm build:cov` + server)
- `pnpm coverage:merge` — merge `.coverage/{unit,browser,server-v8}` → `coverage/`

## Coverage mechanics
Vitest raw V8 via `vitest-monocart-coverage` (`mcr.config.mjs`); e2e browser V8 via fixture (`tests/e2e/fixtures.ts`); Next server V8 via `NODE_V8_COVERAGE` on a `COVERAGE=1` webpack build (`.next-cov`). Merge keeps only route chunks + files that exist under `src/`.
e2e fixture fails a test on console errors/warnings, page errors, failed requests, HTTP ≥ 400 (allow via `allow-status` annotation).
