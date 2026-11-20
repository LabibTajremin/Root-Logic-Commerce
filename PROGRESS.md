RUNNING
Now: preflight — waiting for owner to connect Figma (Phase 1); next: Phase 0 quality-gate scaffold

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
- Figma MCP (write): pending — connector failed to connect; owner connecting
- SMTP/SMS/WhatsApp/S3/Drive/GA4/Vercel: not required (fakes)

## Skipped

## Decisions
- Git flow (owner): one work branch `claude/vibrant-cannon-wwnfb9` + one PR → main; phases stack on it; never push to main.
