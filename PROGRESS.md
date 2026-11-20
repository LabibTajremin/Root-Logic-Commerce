RUNNING
Now: Phases 4+5 green locally (dfb2bb7, verify 141/141 files at 100%); waiting on CI, then tick both and add PR sections. Next: Phase 6 (messages outbox + channels, insights, promotions).

## Phases
- [x] Phase 0 — quality gate (pnpm verify + CI on PR) — phase 0 done 3dc6088 (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions/runs/44727113133)
- [x] Phase 1 — Design (Figma) — https://www.figma.com/design/1NGfJz6PU8rxZ5pHgIcrsr · see design/README.md
- [x] Phase 2 — Scaffold — phase 2 done c9409d4 (CI green with phase 3 at f547015)
- [x] Phase 3 — Core domain + DB — phase 3 done f547015 (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions — green)
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
- Figma MCP (write): granted — file https://www.figma.com/design/m2Lp8fxK2nnbcXB2c9qijG (created on Starter team; student plan key rejected by create_new_file; owner moving it)
- SMTP/SMS/WhatsApp/S3/Drive/GA4/Vercel: not required (fakes)

Preflight: done 2026-11-20

## Skipped
- S3 and Google Drive *upload* storage adapters (no credentials; S3 needs SigV4 client). Configured but unavailable drivers fail uploads with a friendly message; Drive *links* work. Planned for Phase 7 (needed for the Vercel profile).
- Blurhash placeholders: dominant colour is stored and shown instead (smaller, no extra dep).

## Decisions
- Coverage gate measures each source file in the layer that runs it (Vitest / e2e browser for 'use client' / e2e Next server), every file must be 100%. Merging line ranges across differently compiled bundles misaligned (false gaps) — documented in scripts/coverage-merge.mjs. Coverage builds tag our sources `rlc/src/…` to avoid Next's own `src/` paths. JSON dictionaries excluded as data files.
- e2e fixture flushes browser coverage before goto/reload (full navigations drop the old document's script coverage); each test uses its own X-Forwarded-For so sign-in rate limits don't leak.
- e2e projects: mobile → desktop → settings. Store-wide switches (OTP toggles, theme) live in `settings.spec.ts` and run last, serially, so parallel tests never see them flip.
- Track order is a POST server action (not a GET query) so shoppers' phones never land in URLs/logs. Order success page shows only the number.
- OTP code is consumed on verify; if the order then fails (e.g. stock), the shopper requests a new code.
- Switching theme in the design editor merges that theme's defaults (fonts, colors, style); live preview updates CSS variables, slot layout changes show after publish.
- Browser coverage: flushes keep the script URL so monocart merges V8 per script; copies of a module in several chunks don't sum branch counts reliably, so the cart store is written branch-free.
- Keyboard-drag e2e waits for dnd-kit's announcement of a different target before dropping (fast presses were ignored on mobile).
- SUPER_ADMIN login is seeded from BOOTSTRAP_SUPER_EMAIL/PASSWORD; only it can grant/revoke entitlements (plan page).
- Media: next/image with a custom loader → /api/media/[id]/[w] (nearest stored WebP variant, immutable cache). Uploads limited by bytes sniffing, per-purpose size, per-store quota and a free-disk guard.
- Runtime singleton lives on globalThis (Next bundles routes separately → module singletons duplicated; with PGlite that meant two diverging DB instances). DomainError detection is structural (isDomainError) for the same reason.
- Phases 4 and 5 share one gate: admin order screens need storefront checkout for e2e data; storefront follows immediately.
- Order numbers: per-store counter `stores.order_seq` (row-locked UPDATE … RETURNING) instead of max()+1 retry — no race, no untestable retry branch.
- Domain events: `order.placed` + `order.<status>` (confirmed/processing/shipped/delivered/cancelled/returned); subscriber errors are reported, never block the action.
- `knip` (unused exports) deferred to Phase 7: modules export APIs that later phases consume.
- Owner asked to design `attar-aloy` (আতর আলোয়) now too: Figma modes 'Attar Aloy · Light/Dark' + page 'Attar Aloy'. Palette light: bg #FDF8F8, soft #F7ECEF, text #2E2A35, accent #B76E8A (dusty rose), button #6B5B8C (plum), radius 22/14, fonts Cormorant Garamond Light + Manrope. Code still built via the Phase 8 skill.
- PR: https://github.com/LabibTajremin/Root-Logic-Commerce/pull/2 (draft, all phases stack here).
- ankito tokens (from site CSS): bg #fbf8f2, surface #fff, soft #f4eee2, ink #1e2a1c, muted #5f6a5b, line #e7dfcf, brand #3c6430 (hover #2f5026, deep #22381c, tint #edf3e7), accent #a8763e (tint #f6ead8), radius 18/10, fonts DM Serif Display + DM Sans + Hind Siliguri, soft green-tinted shadows.
- Figma layout (owner): one page per theme (minimal, organic, attar, ankito), each with Storefront + Admin, Web 1440 + Mobile 390; plus Foundations.
- Extra theme requested by owner: `ankito` (based on owner's own site https://ankito-run.vercel.app/) — design in Phase 1, build in Phase 5.
- Git flow (owner): one work branch `claude/vibrant-cannon-wwnfb9` + one PR → main; phases stack on it; never push to main.
