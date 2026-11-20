RUNNING
Now: Phase 0 done locally; next: open PR, CI green, then Phase 1 Figma

## Phases
- [ ] Phase 0 — quality gate (pnpm verify + CI on PR)
- [ ] Phase 1 — Design (Figma)
- [ ] Phase 2 — Scaffold
- [ ] Phase 3 — Core domain + DB
- [ ] Phase 4 — Admin panel
- [ ] Phase 5 — Storefront + themes
- [ ] Phase 6 — Messages, insights, promotions
- [ ] Phase 7 — Hardening & deploy
- [ ] Phase 8 — Theme-builder skill
- [ ] Phase 9 — Update automatic-agentic-run skill

## Preflight
- git push to `claude/vibrant-cannon-wwnfb9`: granted (verified dry-run)
- GitHub Actions read (MCP): granted; `gh` CLI: not available (search only) → CI read via GitHub MCP
- Node 22.23 / pnpm 10.28 / Playwright + Chromium: granted
- Figma MCP (write): granted — plan `2019100000044's team` (Full seat)
- SMTP/SMS/WhatsApp/S3/Drive/GA4/Vercel: not required (fakes)

Preflight: done 2026-11-20

## Skipped

## Decisions
- Figma layout (owner): one page per theme (minimal, organic, attar, ankito), each with Storefront + Admin, Web 1440 + Mobile 390; plus Foundations.
- Extra theme requested by owner: `ankito` (based on owner's own site https://ankito-run.vercel.app/) — design in Phase 1, build in Phase 5.
- Git flow (owner): one work branch `claude/vibrant-cannon-wwnfb9` + one PR → main; phases stack on it; never push to main.
