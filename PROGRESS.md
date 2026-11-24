IN_PROGRESS: Phase 13 (Checkout & orders) — spec docs/BUILD_SPEC.md
Now: Phase 13 Checkout & orders — done so far: C6 extra fields, C18 checkout line edit, C19 big CTA, C2 coupons (percent/fixed/free delivery, scope, dates, total + per-phone limits, auto-apply, atomic last use), C3 free delivery rules + cart hint, C7 qty and order limits, C1 incomplete orders (CI green 4386ad5), C4/C17 district list + auto zone (CI green 50ce2e8), C5 share location (CI green 4205f7f), C10 thank-you builder (293/293 at 100%). NEXT: C12 manual order → C13/C21 statuses → C14 returns → C15 source → C16 invoices → D1/D3/D4/D5 → F4 → F12 → B2. Carried in from Phase 12: B6 certificate images + trust strip on checkout/thank-you/footer; J1 checkout & thank-you tabs; products in CSV/variant/bulk switch actions are not yet in the activity log.

## Owner requests queued for J1 (design editor) — 2026-11-21
- DONE: background sliders (cream→white, warm↔cool, midnight→black).
- DONE: logo, dark-mode logo, footer logo, favicon uploads.
- Google Drive *uploads* storage adapter (Drive links work; local + S3 adapters exist).
- DONE: footer style presets + show/hide blocks (colours follow theme tokens).
- Logo text: any text/script as typed, font choice, on/off — DONE (b3b2d5f). Section on/off — DONE. Currency sign + date format — DONE.

## Phases
- [x] Phase 0 — quality gate (pnpm verify + CI on PR) — phase 0 done 3dc6088 (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions/runs/44727113133)
- [x] Phase 1 — Design (Figma) — https://www.figma.com/design/1NGfJz6PU8rxZ5pHgIcrsr · see design/README.md
- [x] Phase 2 — Scaffold — phase 2 done c9409d4 (CI green with phase 3 at f547015)
- [x] Phase 3 — Core domain + DB — phase 3 done f547015 (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions — green)
- [x] Phase 4 — Admin panel — phase 4 done 010ebc3 (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions/runs/44818857458 — green, gated with phase 5)
- [x] Phase 5 — Storefront + themes — phase 5 done 010ebc3 (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions/runs/44818857458 — green)
- [x] Phase 6 — Messages, insights, promotions — phase 6 done 3bbb01d (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions/runs/44851341080 — green)
- [x] Phase 7 — Hardening & deploy — phase 7 done 21bc2f8 (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions/runs/44876019184 — green)
- [x] Phase 8 — Theme-builder skill — phase 8 done 21bc2f8 (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions/runs/44876019184 — green; theme attar-aloy shipped)
- [x] Phase 9 — Update automatic-agentic-run skill — phase 9 done 21bc2f8 (docs/SKILL_FEEDBACK.md)

## Phases 10–19 (docs/BUILD_SPEC.md §9, no approval stop)
- [x] Phase 10 — Single merged Figma design — done (Figma 1NGfJz6PU8rxZ5pHgIcrsr; 187 Core screens + 5 theme pages; design/README.md) (9-page rule; first attempt rejected: no reel cover-flow, missing admin screens, v1/v2 pages duplicated)
- [x] Phase 11 — Foundations — phase 11 done d547b1d (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions/runs/45178997698; 232/232 files 100%)
- [x] Phase 12 — Catalog — phase 12 done 9d9228f (CI https://github.com/LabibTajremin/Root-Logic-Commerce/actions/runs/45276390548; 277/277 files 100%)
- [ ] 13 Checkout & orders · [ ] 14 Courier · [ ] 15 Marketing · [ ] 16 AI · [ ] 17 Growth & business · [ ] 18 Extended modules · [ ] 19 Hardening & docs
- Feature IDs done (§13): —
- Also done earlier: CI split into lint / unit / integration / e2e jobs + full verify gate (`test:unit`, `test:integration`, `test:e2e`).

## Preflight
- Preflight (handoff 2026-11-22): git push dry-run ok; GitHub MCP reads PR #2 + 5 CI jobs; Figma MCP edit (account TariQ Hub) — create/delete scratch node ok
- git push to `claude/vibrant-cannon-wwnfb9`: granted (verified dry-run)
- GitHub Actions read (MCP): granted; `gh` CLI: not available (search only) → CI read via GitHub MCP
- Node 22.23 / pnpm 10.28 / Playwright + Chromium: granted
- Figma MCP (write): granted — file https://www.figma.com/design/m2Lp8fxK2nnbcXB2c9qijG (created on Starter team; student plan key rejected by create_new_file; owner moving it)
- SMTP/SMS/WhatsApp/S3/Drive/GA4/Vercel: not required (fakes)

Preflight: done 2026-11-20

## Footprint check (spec §8)
Production standalone build pinned to 1 CPU (`taskset -c 0`, `--max-old-space-size=256`), real Postgres 16 (`shared_buffers=128MB`), migrated with `pnpm db:migrate`:
- idle RSS **132 MB**; after 20 s of 20 concurrent clients (home, search, track, 404): **192 MB** (budget ≤ 300 MB)
- **104 req/s**, p50 178 ms, p95 299 ms, 0 errors
Namecheap Spark-class VPS (1 vCPU / 2 GB) fits: app ≤ ~450 MB worst case (PM2 restarts above), Postgres small, Caddy ~30 MB. Measured 2026-11-21.

## Skipped
- S3 and Google Drive *upload* storage adapters (no credentials; S3 needs SigV4 client). Configured but unavailable drivers fail uploads with a friendly message; Drive *links* work. Planned for Phase 7 (needed for the Vercel profile).
- GA4 *data inside admin* (premium ga4InAdmin) needs a Google service account per store; the dashboard shows the lock / "Root Logic Lab will connect it" note. gtag + ecommerce events on the storefront are done.
- Video duration cap: size cap (20 MB, configurable) is enforced; duration needs container parsing (mp4/webm) — help text asks for ≤30 s.
- Blurhash placeholders: dominant colour is stored and shown instead (smaller, no extra dep).

## Decisions
- Phase 11 (2026-11-22): Google Drive *uploads* recorded as "links only" — final. Drive links work for product photos and logos; uploading into Drive would need Google OAuth credentials the stores don't have. Local + S3 storage adapters cover uploads.
- Phase 11: J1 editor tabs whose options control features not built yet (ratings/sold counts on cards, B2 sticky bar & button order, checkout fields C4/C6, thank-you C10, mobile menu B10 items) ship with those features in Phases 12–13 instead of as dead switches. Done now: header & logo, colours & background sliders, footer, home sections, language, layout gallery, announcement, hero slider.
- Phase 11: J3 switch dialog needs demo packs (catalog demo data) → ships with Phase 12.
- Phase 11: F3 logs settings saves (design/business/layout, undoable). Products/orders/categories/pages join the log as their modules are reworked in Phases 12–13 (orders already keep per-order history). The audit context lives on globalThis: per-route bundles otherwise get separate AsyncLocalStorage copies.
- Phase 12: A1 — a product with options keeps stock as the sum of its variants; manual stock adjustment is refused for it (stock.has_variants) so the total cannot drift. Option edits rebuild the matrix and keep rows whose label still exists. Cards of products with options link to the page ("Choose options") instead of adding to cart.
- Phase 12: A11 — per-page adds 6 (phones) to the spec’s 12/24/48; lists use the cheapest variant price for price filter/sort; the filter panel opens when any filter is set.
- Phase 12: A7 — shoppers review at /review with order number + phone (POST, shares the tracking rate limit); one review per order+product, shown only once approved; no rating/AggregateRating until a real approved review exists. Shopper photo uploads deferred (screenshots by the owner cover social proof); the /review link is sent by the Phase 15 review-request messages.
- Phase 12: A15 — images import by Google Drive link only (no server-side fetch of arbitrary URLs: SSRF) and only for newly created products; variant rows update combinations the product already has (options are set in the product editor); the export carries no image links. Import writes only a sheet with no row errors; an image-link failure stops after earlier rows were saved.
- Phase 12: B5 — new home sections arrive switched off (a deploy never changes a live home page); reels, combos, flash sale, newsletter and FB follow join the builder with their own features (Phases 15/17). B6 — numbers + warranty line now, shown on home and product pages; certificate images with a viewer and the checkout/footer placements come with the checkout rework (Phase 13). Empty sections hide by CSS.
- Phase 13: C2 — the checkout total shows a discount once "Apply" is pressed (typed code, or with none the best automatic coupon); placing always re-prices on the server. The total-use limit is enforced inside the order transaction; the per-phone limit is checked just before (two simultaneous orders from one phone could both pass).
- Phase 13 C1: drafts are saved server-side once the phone is a valid BD number (debounced, rate-limited, one per store+phone, skipped quietly when invalid), and the shopper's own copy lives in localStorage for the "still here" restore — restoring from the server by phone would show one shopper's address to anyone typing that number. Convert places the order with the shop's rules (missing address fields = validation error, draft kept). Auto-assign waits for F6 (staff assignment not built yet). Purge runs in the existing cron. Client components import pure order rules from `@/modules/orders/client` — the barrel pulled the orders service into every page chunk (CI Lighthouse / 94).
- Phase 13 C4/C17: all 64 districts (EN/BN + old spellings) with a searchable district list in "picker" mode; owner maps districts to zones (default Dhaka → Inside, others → Outside) and checkout preselects the zone with a chip, re-guessing only while the address is typed so a picked zone stays. Thana stays free text with a hint: no verified thana/upazila dataset is in the repo, and shipping a guessed list of ~500 names would be wrong data — add one when a source is chosen.
- Phase 13 C5/C10: location is a jsonb point on the order (Permissions-Policy now geolocation=(self)). Thank-you texts/colour/buttons live in Shop info (the J1 thank-you tab is still a carry-over). The order summary + Print invoice show only in the browser that placed the order (signed 1-hour `rlc-placed` cookie of number:phone, same HMAC as the layout preview) — the page URL alone never reveals the order. Upsell popup waits for B8 popups (not built yet).
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
- Messages: order events only *queue* (outbox, dedupe key per order/event/channel/recipient); sending is the cron route (Vercel, Bearer CRON_SECRET) or an in-process worker (VPS). MESSAGES_TRANSPORT=log records instead of sending (dev/e2e). Channel secrets are sealed with AES-GCM (SETTINGS_KEY) and write-only in the UI. OTP codes use the same channels.
- Insights: visitor = HMAC(authSecret, store+ip+UA+Dhaka day); daily_stats upserts per view/event; revenue = subtotal counted on DELIVERED, reversed on RETURNED; raw page_views purged after 30 days.
- Promotions: embeds are youtube-nocookie / FB / IG players behind a tap-to-load facade; e2e stubs third-party hosts (gtag, embeds) in the fixture.
- Security: CSP + nosniff/Referrer/Permissions/X-Frame headers on every route (HSTS outside the e2e build); 'unsafe-inline' scripts are needed for Next's streamed payload and the GA snippet; zod runs jitless in the browser so no 'unsafe-eval'. Checkout (10/10 min) and tracking (20/10 min) are rate-limited per store + IP in process memory.
- Media on Vercel: S3-compatible adapter (aws4fetch SigV4, path-style; R2/S3/MinIO); STORAGE_DRIVER=s3 requires all S3_* env at boot. Drive *uploads* stay unavailable (links work).
- Media is served by the app (/api/media, immutable cache) rather than Caddy reading the disk directly: URLs carry media ids, not file paths, so access stays per-store; Caddy/CDN cache the immutable responses.
- Lighthouse gate (scripts/lighthouse.mjs, part of verify): /, /search, /search?q — all ≥ 95 on mobile (measured 96–97 perf, 100 a11y/BP/SEO). Checkout/track/order are noindex on purpose and excluded from the SEO bar.
- knip (dead code) reviewed once: findings were public-API re-exports used by tests, path-referenced fonts and config files; removed the one truly unused dependency (@testing-library/react). Not wired into the gate (needs per-file config to avoid false positives).
- legacy/ deleted at the end of Phase 7 (spec §0.12).
- Phase 8: `.claude/skills/new-theme/SKILL.md` written from the final code; applied in this session (not a separate fresh session) to the spec's description → shipped theme `attar-aloy` (light, rose/plum, Cormorant Light + Manrope, airy, centred). It is in the every-theme e2e (axe, both viewports) and selectable in Admin → Design.
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
