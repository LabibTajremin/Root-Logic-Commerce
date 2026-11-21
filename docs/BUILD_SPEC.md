# BUILD_SPEC — Root Logic Commerce (configurable e-commerce for small businesses)

> Agent: this file is the single source of truth. Read it once, fully. Then work phase by phase.
> Do not re-read it whole; jump to the § you need. Owner: Root Logic Lab.

---

## §0 Agent operating rules (token + code economy) — follow strictly

1. **First action:** create `CLAUDE.md` (≤40 lines) = §0 + §2 stack + §4 folder map + commands. Create `PROGRESS.md` (checklist of §9 phases). Never paste this spec into other files.
2. **Fully autonomous (§11):** run Phases 1–9 back to back with no human gates. A phase is complete only when local checks **and** GitHub CI are green; then commit, push, tick `PROGRESS.md`, start the next phase. Stop only when all phases are done (or §11 BLOCKED rule).
3. **Read narrowly:** use grep/glob to locate, read only needed line ranges, never re-read a file you just wrote. No repo-wide dumps.
4. **Edit, don't rewrite:** use targeted edits; never regenerate a whole file to change a few lines.
5. **Terse output:** no narration, no restating code in chat, no summaries of unchanged files. End-of-phase report ≤10 lines.
6. **No speculative code:** build only what §5–§8 require. No unused abstractions, no dead code, no placeholder files.
7. **Comments:** only non-obvious *why*. Never *what*. No banner comments, no JSDoc on obvious functions.
8. **Dependencies:** each new dep must justify itself (size + need). Prefer platform/CSS over libraries. Check bundle impact.
9. **Tests:** TDD — write failing test → implement → refactor. Run only affected tests while iterating (`vitest related`), full suite at phase end. Never declare done without a green run.
10. **Subagents:** only for isolated, parallelizable work (e.g., building 3 themes). Give them the exact § numbers, not the whole spec.
11. **When unsure:** pick the simplest option consistent with this spec, note it in `PROGRESS.md › Decisions` (one line), continue. Never ask the human — there is no one watching.
12. **Legacy reference:** `legacy/` holds curated code + ADRs from an earlier build. Read `legacy/README.md` once; then open only the files it maps to your current phase. Exclude `legacy/` from tsconfig, lint, tests, coverage, build. Delete it at end of Phase 7.
13. **Git:** work in the repo provided by the owner. One work branch with an open PR to `main` (never push to `main` directly; phases stack on that PR), Conventional Commits, small commits, push after every commit. Never commit secrets; ship `.env.example`.

---

## §1 Product in one paragraph

Small Bangladeshi businesses (attar, organic food, rice, lentils, etc.) get an online store: public storefront + an extremely simple admin panel (usable by non-technical owners, guided in **English + বাংলা**). The **core commerce engine is fixed and identical for everyone**; the **look is a swappable theme** (per product niche) plus deep visual customization from admin. Mobile-first — most buyers order from phones. Cheap to run: first on **Vercel free tier**, then many stores on **one Namecheap VPS**. Upsell via locked premium features.

---

## §2 Stack (fixed)

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js latest stable, App Router, TypeScript `strict` | SSR/ISR for SEO, one codebase for store + admin |
| DB | PostgreSQL 16 + **Drizzle ORM** + drizzle-kit migrations | Lightweight vs Prisma, low RAM |
| Validation | Zod (shared client/server) | |
| Auth | Better Auth (email+password, sessions, roles) | |
| Styling | Tailwind CSS v4 driven by CSS variables (theme tokens) | |
| Admin UI kit | shadcn/ui (only components actually used) | |
| Drag & drop ordering | @dnd-kit/sortable | |
| Images | sharp (server) | |
| Charts | hand-rolled SVG or uPlot (no heavy chart libs) | |
| Tests | Vitest + Testing Library, **PGlite** for DB integration tests, Playwright e2e | PGlite = real Postgres in-process, no Docker, fast |
| Package manager | pnpm | |
| Node | 22 LTS | |

Single Next.js app (no monorepo). Output `standalone`.

---

## §3 Architecture

**Modular monolith, microservice-ready.** Each business module is self-contained with its own domain, use-cases and ports; modules talk only via their public `index.ts` or domain events. Any module (e.g. payments) can later be extracted into a separate service by swapping its adapter — no caller changes.

```
UI (app/ routes, server actions)  →  application (use-cases)  →  domain (pure rules)
                                          ↓ ports (interfaces)
                               infrastructure adapters (db, storage, notify, analytics)
```

Rules:
- `src/modules/*/domain` and `application` import **nothing** from Next.js, Drizzle, or other modules' internals.
- Repository pattern: ports in `application/ports.ts`, Drizzle implementations in `src/infrastructure/db/repositories`.
- Domain events via a tiny in-process bus (`order.confirmed`, `order.cancelled`, …). Subscribers: stock, messages, insights.
- **Multi-tenant by design:** every tenant-owned row has `store_id`. Store resolved per request from `Host` header → `store_domains`; fallback `DEFAULT_STORE_SLUG`. `STORE_MODE=single|multi`. One Node process serves many stores on the VPS (far less RAM than one process per store).
- Composition root: `src/server/container.ts` wires adapters by config. No DI framework.

---

## §4 Folder structure (humanized — names a non-dev can follow)

```
.
├── root-logic-commerce.code-workspace   # VS Code multi-root: "Storefront", "Admin Panel",
│                                        #   "Business Logic", "Themes", "Settings & Config", "Tests"
├── store.config.ts                      # first-deploy defaults (theme, name, toggles) — §6
├── src/
│   ├── app/
│   │   ├── (storefront)/                # public site routes
│   │   ├── admin/                       # admin panel routes (same project, /admin)
│   │   └── api/                         # webhooks, cron, media proxy, analytics beacon
│   ├── modules/                         # business logic, one folder per capability
│   │   ├── access/        (login, roles, sessions)
│   │   ├── catalog/       (categories, products, ordering)
│   │   ├── orders/        (cart, checkout, status flow)
│   │   ├── stock/         (inventory movements)
│   │   ├── customers/
│   │   ├── messages/      (email / SMS / WhatsApp, OTP)
│   │   ├── media/         (upload, resize, drive links, video embeds)
│   │   ├── promotions/    (banners, posters, promo video)
│   │   ├── insights/      (visitors + sales analytics)
│   │   ├── site-settings/ (design + business settings)
│   │   ├── plans/         (premium entitlements)
│   │   └── payments/      (port only — implemented later)
│   │       each: domain/ application/ index.ts
│   ├── infrastructure/   db/ (schema, migrations, repositories) storage/ notify/ auth/
│   ├── themes/           _contract.ts, registry.gen.ts, minimal/, organic/, attar/
│   ├── ui/               shared admin + primitive components
│   ├── help/             en.json, bn.json  (admin guide texts, keyed by field id)
│   ├── i18n/             en.json, bn.json  (UI strings)
│   └── server/           container.ts, tenant.ts, config.ts
└── tests/                integration/ e2e/ fixtures/
```

---

## §5 Functional requirements (MVP = all of these)

### 5.1 Access & roles
- Roles: `SUPER_ADMIN` (Root Logic Lab: plans, branding, all stores), `OWNER` (everything in own store), `STAFF` (products, orders, stock; no settings/users).
- Admin at `/admin`, username/password login. Rate-limited login, secure httpOnly cookies, CSRF-safe server actions.
- Shoppers: guest checkout by phone (BD format validation). Optional customer account later — don't build now.

### 5.2 Catalog
- Category → sub-category tree (2 levels min, schema allows N). Admin controls **ordinal** of categories, sub-categories and products via drag & drop (`sort_order` int).
- Product: name, slug (auto, editable), description (simple rich text: bold/list/link only), price, compare-at price, **cost price** (for profit), stock qty, SKU (optional), status (draft/active/archived), images (multiple, reorderable), optional video, SEO fields.
- Images: **upload file or paste Google Drive link** — both supported (§7.3).

### 5.3 Orders
- Cart (drawer), checkout: name, phone, address, area/district, note, delivery zone (charges configurable: e.g. Inside Dhaka / Outside Dhaka), payment method `COD` (others via payments port later).
- Optional OTP verification before placing order — **email OTP on/off**, **SMS OTP on/off** (admin toggles).
- Status flow: `PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED`; `CANCELLED` from any pre-delivery state; `RETURNED` after delivered. Every transition stored in `order_events` (who, when, note).
- Admin: list with filters (status, date, search phone/order no.), detail view, one-tap status change, printable invoice.
- Public "Track my order" page: order number + phone.

### 5.4 Stock (inventory)
- Stock is **deducted on CONFIRMED** (not on placement): atomic `UPDATE … SET stock = stock - q WHERE stock >= q`; fail confirm if insufficient.
- Restock on CANCELLED/RETURNED if previously deducted. Every change logged in `stock_movements`.
- Placement checks availability (soft). Low-stock threshold setting + dashboard alert. Manual adjust with reason.

### 5.5 Messages (notifications)
- Channels: Email (SMTP adapter), SMS (generic HTTP adapter configurable for BD gateways), WhatsApp (WhatsApp Cloud API adapter). Each on/off + credentials in admin; owner's WhatsApp/SMS sender numbers set in admin.
- Triggers: order placed, confirmed, shipped, delivered, cancelled → customer; new order → owner. Templates editable (EN/BN) with `{{orderNo}}`-style vars.
- Delivery via **outbox table** + worker (Vercel Cron route / VPS interval). Retries with backoff. Never block checkout on sending.

### 5.6 Insights (dashboard)
- Ranges: today / 7d / 30d / 12m / custom; group by day/week/month/year.
- Metrics: visitors (unique), page views, orders placed / confirmed / delivered / cancelled / returned, revenue, cost, gross profit, AOV, conversion rate, top products, low stock.
- First-party, cookieless tracking: `POST /api/beacon`; visitor id = hash(ip + UA + day + store salt). Upsert into `daily_stats` (no raw-event bloat; keep raw `page_views` 30 days max).
- **Google Analytics 4:** admin pastes Measurement ID → gtag loaded (after interaction / idle, not blocking), ecommerce events (`view_item`, `add_to_cart`, `begin_checkout`, `purchase`). Showing GA4 data inside admin via GA Data API = **premium** (§5.10).

### 5.7 Promotions & media
- Promo banner section: on/off. Source = pick products (uses their image + promo message + CTA) **or** upload own image(s). Carousel if >1.
- Poster banner builder (simple: background image/colour, headline, sub-text, button) and short promo video upload (mp4/webm, size cap configurable, default 20 MB).
- Embeds: **YouTube, Facebook, Instagram** video URLs parsed → playable embed using click-to-load facade (no 3rd-party JS until tap). Admin help note explains how to copy each link.

### 5.8 Site design (admin → "Design" page with live preview)
Split screen: controls left, live preview iframe right (mobile/desktop toggle). Changes preview instantly, save publishes (revalidate cache tags).
Controls (all stored in `site_settings.design`, schema §6):
- Theme select (from registry) — theme sets defaults, everything below overrides.
- Logo (image) or text logo, store name, **name font**, **site font** (curated premium list incl. Bangla: Hind Siliguri, Noto Sans Bengali, Anek Bangla, Tiro Bangla; Latin: Inter, Manrope, Playfair Display, Cormorant, DM Serif, Poppins, Outfit, Fraunces…). Self-hosted via `next/font`, subset, `display: swap`.
- Favicon.
- Colors: accent, button, menu/header, text — with auto contrast check (warn below WCAG AA).
- Mode: light (white / off-white / cream) or dark (midnight / black); optional visitor toggle.
- Background pattern: **24 built-in SVG patterns** + none; **pattern opacity slider (0–100%)**.
- **Header opacity slider**, sticky on/off.
- Card style (flat / bordered / elevated / glass), showcase style (grid / carousel / list / featured-hero), hover animation (none / lift / zoom / glow), animation style (none / subtle / smooth / playful). Always honor `prefers-reduced-motion`.
- Footer text, social links, contact (phone, WhatsApp, address, map link).
- Footer credit "© Root Logic Lab" always rendered unless entitlement `removeBranding`.

The admin panel itself picks up the accent color + font so it feels like the owner's brand, while staying readable.

### 5.9 Help & guidance (non-technical owners)
- Every form field / action has a `<HelpHint id>` (ⓘ popover) from `help/en.json` / `help/bn.json`. Language toggle EN/বাং in admin header; default from config.
- Empty states explain the next step ("No products yet — add your first one"). First-login checklist (logo → category → product → test order).
- Every media upload field states recommended size, ratio and max file size (§7.3 table).
- Destructive actions confirm; prefer archive over delete.

### 5.10 Plans & premium locks
- `store_entitlements` (set only by SUPER_ADMIN or config): e.g. `removeBranding`, `ga4InAdmin`, `seoPro`, `customDomain`, `extraThemes`, `videoUploads`.
- Locked features **are visible** in admin with a lock badge and "Unlock — contact Root Logic Lab" (WhatsApp link from config). Show value, don't hide it.
- Free tier must still fully run a store: products, orders, analytics dashboard.

### 5.11 SEO
- SSR/ISR pages, `generateMetadata` per page, canonical URLs, Open Graph/Twitter images, `sitemap.xml` + `robots.txt` per store/domain, JSON-LD (`Product`, `Offer`, `BreadcrumbList`, `Organization`), clean slugs, image alt from admin.
- Admin SEO settings: site title template, meta description, default share image, per-product/category overrides. `seoPro` adds keyword hints / audit checklist.

---

## §6 Configuration (precedence: defaults < `store.config.ts` < env < DB/admin)

- `store.config.ts`: first-deploy defaults — store name, default theme, locale, currency (`BDT`), toggles (OTP email/SMS, channels), storage driver, plan entitlements, contact WhatsApp of Root Logic Lab. Validated by Zod at boot; fail fast with readable error.
- Secrets **only** in env (`DATABASE_URL`, `AUTH_SECRET`, SMTP/SMS/WA/S3/Drive creds) — admin may store creds encrypted (AES-GCM with `SETTINGS_KEY`) when owner sets them in UI.
- Admin can override theme and all settings at runtime; config only seeds.

Design settings type (keep in `modules/site-settings/domain/design.ts`):
```ts
type Design = {
  themeId: string
  brand: { name: string; logo?: MediaRef; nameFont: FontId; siteFont: FontId; favicon?: MediaRef }
  mode: { base: 'light' | 'dark'; light: 'white' | 'offwhite' | 'cream'; dark: 'midnight' | 'black'; visitorToggle: boolean }
  colors: { accent: Hex; button: Hex; header: Hex; text?: Hex }
  background: { pattern: PatternId | 'none'; patternOpacity: number /*0-100*/ }
  header: { opacity: number /*0-100*/; sticky: boolean }
  style: { card: 'flat'|'bordered'|'elevated'|'glass'; showcase: 'grid'|'carousel'|'list'|'hero'; hover: 'none'|'lift'|'zoom'|'glow'; motion: 'none'|'subtle'|'smooth'|'playful' }
  footer: { text?: string; socials: { kind: SocialKind; url: string }[] }
}
```
Rendered as CSS custom properties on `<html>` (server-side, no flash). Themes read only tokens.

---

## §7 Themes, media, data

### 7.1 Theme plugin contract (`src/themes/_contract.ts`)
```ts
type Theme = {
  id: string; name: string; niche: string; preview: string
  defaults: Partial<Design>
  slots: { Header; Footer; Hero; ProductCard; ProductGallery; CategoryNav; PromoBanner; EmptyState }  // React server components
}
```
- Core pages compose slots; a theme can override any slot, missing slots fall back to `minimal`.
- **New theme = drop a folder in `src/themes/`**, `pnpm themes:gen` regenerates `registry.gen.ts` (build-time, statically imported → tree-shaken per route via dynamic import).
- Ship 3 themes: **minimal** (default, clean), **organic** (earthy greens, cream, soft rounded), **attar** (luxury, midnight + gold, serif). Each must look premium, humane, attractive on mobile first.
- Theme contract test: every theme renders all pages with sample data without errors (snapshot-free, a11y check via axe).

### 7.2 Storage adapters (`StoragePort`)
`local` (VPS disk, `/var/lib/rlc/media`), `s3` (any S3-compatible: AWS, Cloudflare R2, MinIO), `gdrive` (service account). Selected by config per store.

Two hosting profiles, chosen by `HOSTING_PROFILE=vercel|vps` (both first-class, both covered by e2e):

| Profile | Media storage | Rules |
|---|---|---|
| `vercel` | `gdrive` or `s3` only | No persistent disk → `local` rejected at boot with a clear message. Owner onboarding doc explains how to set up Drive / R2 / S3. |
| `vps` (Namecheap, ~20 GB SSD) | `local` by default (`s3`/`gdrive` optional) | Disk is shared by OS + Postgres + all stores → enforce the disk budget below. |

VPS disk budget (all configurable in `store.config.ts`):
- Per-store media quota (default 2 GB) enforced on upload; admin shows "Storage used: X of Y" bar and blocks upload with a friendly EN/BN message when full.
- Store only what is served: originals are **not** kept — save WebP variants 320/640/1024/1600 only (AVIF off on `vps` to save disk). Videos: size cap + duration cap.
- Orphan cleanup job (nightly): delete media not referenced for 7 days; deleting a product/banner marks its media orphan.
- Global guard: refuse uploads when free disk < 2 GB; SUPER_ADMIN dashboard shows disk usage per store.
- Files served by Caddy directly from disk (`/media/*`, immutable cache headers), not through Node.
Drive links: extract file id from any share-URL form, store `{kind:'gdrive', id}`, serve through `/api/media/[id]` proxy with long cache headers.

### 7.3 Images never break the layout
- On upload: validate type/size → sharp → strip EXIF → WebP (+AVIF) variants 320/640/1024/1600 → store with width/height/blurhash/dominant color.
- Rendering: every slot uses a **fixed aspect-ratio box + `object-fit: cover`** and optional focal point (admin clicks to set). Any upload size/dimension works on mobile and web.
- Upload field hints:

| Field | Recommended | Ratio | Max |
|---|---|---|---|
| Product image | 1200×1200 | 1:1 | 8 MB |
| Banner desktop / mobile | 1920×640 / 1080×1350 | 3:1 / 4:5 | 8 MB |
| Logo | SVG or 512×128 PNG | free | 2 MB |
| Favicon | 512×512 PNG | 1:1 | 1 MB |
| Promo video | ≤ 30 s, 1080p mp4/webm | 9:16 or 16:9 | 20 MB |

### 7.4 Data model (3NF, all money as `integer` minor units, all tenant tables `store_id` + index)
`stores`, `store_domains`, `store_entitlements`, `users`(+Better Auth tables, `role`, `store_id`), `site_settings`(`store_id` PK, `design` jsonb, `business` jsonb, `version`), `categories`(`parent_id`, `sort_order`, `slug`), `products`, `product_media`(`sort_order`), `media`, `customers`(`phone` unique per store), `orders`(`order_no` human-friendly per store, totals, delivery, payment_method, payment_status, status), `order_items`(snapshot name/price/cost), `order_events`, `stock_movements`, `banners`, `message_templates`, `message_outbox`, `otp_codes`(hashed, TTL), `page_views`(30-day TTL), `daily_stats`(`store_id, date` PK).
Indexes for every list/filter in admin; unique `(store_id, slug)`.

---

## §8 Non-functional

- **Mobile-first** for storefront *and* admin (admin: bottom nav on mobile, big touch targets ≥44px, one-thumb order handling).
- **Performance budget (storefront):** Lighthouse mobile ≥95 all categories; LCP <2.5 s on 4G; initial JS ≤90 KB gz; RSC by default, client components only for interactive bits (cart, gallery, preview). Cache with tags, revalidate on admin save.
- **Footprint:** idle RSS ≤300 MB for one process serving all stores; Postgres tuned small (`shared_buffers=128MB`). Must fit Namecheap Spark VPS — verify against the plan's actual RAM/CPU and record result in `PROGRESS.md`.
- **Security:** Zod-validate every input, authorize every server action by role + `store_id`, rate-limit login/OTP/checkout, upload MIME sniffing, CSP headers, no secrets to client.
- **Accessibility:** WCAG 2.2 AA, keyboard nav, labels, contrast warnings in design editor.
- **i18n:** admin + storefront UI strings EN/BN; Bangla digits optional setting; currency `৳`.
- **Quality:** ESLint + Prettier + `tsc --noEmit` in CI; no `any`; small functions; named exports.
- **Testing (TDD) — 100% coverage is MANDATORY, no exceptions:**
  - Threshold **100% lines, branches, functions, statements over all of `src/**`** (storefront, admin, API routes, server actions, modules, infrastructure, themes, ui). Build fails below 100%.
  - Coverage is the **merged** result of unit + integration + e2e: Vitest (v8) for unit/integration, Playwright e2e with V8 coverage collected from browser *and* Next server, merged into one report (e.g. monocart-coverage-reports). Gate on the merged report in `pnpm verify` and CI.
  - Every layer must also have its own tests: unit (domain, utils, components), integration (every repository/use-case on PGlite, every API route & server action), e2e (every page and every user flow in §5, on mobile 390×844 and desktop 1440×900, in every theme, EN + BN).
  - Mandatory e2e flows (minimum): login per role, create category/sub-category + reorder, create product with upload and with Drive link, place order with/without OTP, confirm → stock deducted, cancel → restocked, insufficient stock, change every Design control → reflected on storefront, premium lock CTA, track order, promo banner/video/embeds, SEO tags & sitemap, analytics counts, storage-quota full message.
  - Allowed exclusions only: generated files (`registry.gen.ts`, drizzle migrations), pure type files, config files — listed explicitly in the coverage config. **No `v8 ignore` / `istanbul ignore` comments, no `.skip`, no lowered thresholds.** Unreachable code is deleted, not ignored.
  - Also zero-error gate: no TypeScript errors, no lint warnings, no console errors/warnings and no failed network requests during e2e (fail the test on any), axe a11y violations = 0.
- **Deploy targets:**
  - Vercel (`HOSTING_PROFILE=vercel`): Neon/Supabase Postgres, media on Google Drive or S3-compatible (R2/S3), Vercel Cron for outbox + stats rollup.
  - Namecheap VPS (`HOSTING_PROFILE=vps`): Node standalone under PM2 (or systemd), Caddy reverse proxy with automatic TLS for all store domains, local Postgres, media on local SSD (§7.2 disk budget), log rotation, nightly `pg_dump` backup (keep 7, compressed) — backups count toward disk budget. Provide `deploy/` with Caddyfile, PM2 ecosystem, setup script, README.
  - Same codebase, no profile-specific forks: differences live only in adapters + config.

---

## §9 Phases (execute in order)

### Phase 1 — Design in Figma (no approval gate)
- Use the Figma MCP (write access verified in preflight). If Figma was declined, this phase is skipped (§11 preflight).
- File "Root Logic Commerce". Pages: **Foundations**, **Storefront – Web (1440)**, **Storefront – Mobile (390)**, **Admin – Web (1440)**, **Admin – Mobile (390)**.
- Foundations: Figma variables for all tokens in §6 with **modes per theme (minimal/organic/attar) × light/dark**; type scale; spacing (4-pt); components (button, input, card variants, product card variants, badges, help hint, lock badge, nav).
- Storefront screens: Home, Category, Product detail, Cart drawer, Checkout, OTP, Order success, Track order, Search, 404 — shown in at least 2 themes.
- Admin screens: Login, Dashboard, Orders list, Order detail, Products list, Product editor (with media upload hints), Categories (drag tree), Stock, Promotions, **Design editor with live preview**, Messages settings, SEO & Analytics, Users & roles, Plan/Premium (locks), Help center. Show EN and বাংলা variants of one screen.
- Commit design artifacts (`design/`, plus the Figma link in `design/README.md`), then continue to Phase 2 — code must follow the design.

### Phase 2 — Scaffold
Repo setup per §2/§4, workspace file, CI (lint, typecheck, test, build), Drizzle + PGlite test harness, config loader + tenant resolver (TDD), `.env.example`, `CLAUDE.md`, `PROGRESS.md`.

### Phase 3 — Core domain + DB (TDD)
Schema + migrations; modules `access`, `catalog`, `orders`, `stock`, `customers`, `plans`, `site-settings` domain + use-cases + repositories. Event bus.

### Phase 4 — Admin panel
All admin screens from Phase 1, help hints EN/BN, media pipeline + storage adapters, design editor with live preview.

### Phase 5 — Storefront + themes
Theme contract, registry generator, 3 themes, all public pages, cart/checkout/OTP/track, SEO.

### Phase 6 — Messages, insights, promotions
Outbox + 3 channel adapters, templates, dashboard metrics, beacon, GA4, promo banners/posters/video/embeds.

### Phase 7 — Hardening & deploy
Full e2e matrix, coverage gate, Lighthouse CI, security headers, load check on VPS-sized container (limit 1 CPU / RAM of Spark plan), `deploy/` scripts, Vercel config, final README (setup in 10 steps, EN). Final report.

### Phase 8 — Theme-builder skill (only after Phase 7 is green)
Create a Claude Code project skill so a future session can turn a plain theme description (EN or বাংলা, e.g. "rice shop, warm earthy, rustic serif, paddy-field feel") into a new working theme folder.
- Path: `.claude/skills/new-theme/SKILL.md` (+ `reference.md` if needed). Committed to the repo.
- Frontmatter `description`: one line, e.g. "Create a new storefront theme in src/themes from a description of a business niche or look."
- Write it **from the final code, not from this spec** — exact file paths, the real `Theme` contract, real token/CSS-variable names, slot list + props, pattern/font ids, `themes:gen` command, test commands. If code and spec differ, code wins.
- Body (≤150 lines, imperative, token-lean):
  1. Inputs to extract from the description: niche, mood, light/dark default, colors (accent/button/header/text), name + site font from the curated list, pattern + opacity, card/showcase/hover/motion style. Ask at most one question only if niche or mood is missing.
  2. Steps: copy `src/themes/minimal` as skeleton → set `id/name/niche/defaults` → override only slots that need a different layout (fall back to minimal otherwise) → add preview image → `pnpm themes:gen` → run theme contract test + a11y + mobile/desktop e2e smoke → contrast check AA.
  3. Rules: tokens only (no hard-coded colors/fonts), RSC only, no new deps, fixed-ratio image boxes, respect `prefers-reduced-motion`, keep JS budget (§8).
  4. One short worked example (the `organic` theme's manifest) as the pattern to imitate.
  5. Done-checklist: registry updated, tests green, theme selectable in admin Design page, screenshot of home + product page on mobile.
- Verify the skill: in a fresh session, run it once with this description and **keep the result as a shipped theme**: "সুগন্ধির দোকান — modern perfume/fragrance boutique, light mode, soft floral pastels, elegant thin serif headings, airy layout, gentle smooth motion." Theme `id: 'attar-aloy'`, `name: 'আতর আলোয় (Attar Aloy)'`. It must look clearly different from `attar` (which is dark midnight + gold). Confirm it passes all theme tests and is selectable in admin.

### Phase 9 — Update the "automatic agentic run" skill from experience (last)
The skill already exists at `.claude/skills/automatic-agentic-run/` and drove this build. Now improve it with what actually happened:
- Read `PROGRESS.md › Decisions`, BLOCKED history, CI failures and fix rounds. Update the skill with real commands (`pnpm verify`, CI workflow name, coverage-merge setup), pitfalls hit and how they were fixed, and anything that wasted tokens. Keep it repo-agnostic and ≤120 lines; keep §2 quality gate unchanged or stricter.
- Sync `autopilot.sh` in the skill folder with `scripts/autopilot.sh`.
- Write `docs/SKILL_FEEDBACK.md` (≤30 lines): what changed in the skill and why — the owner uses it to update the copy saved in their Claude account.

**Out of scope now:** online payments (port only), customer accounts, multi-currency, marketplace features.

---

## §10 Definition of done (each phase)
- [ ] `pnpm verify` green locally (lint, typecheck, unit+integration with coverage gate, build, e2e)
- [ ] GitHub Actions CI green for the pushed commit (`gh run watch`)
- [ ] Coverage thresholds met; new e2e flows pass on mobile + desktop
- [ ] No unused deps/exports (`knip`), no TODOs left without a `PROGRESS.md` entry
- [ ] `PROGRESS.md` ticked, decisions logged, committed on phase branch

---

## §11 Autopilot (unattended run)

Started by `scripts/autopilot.sh`, which relaunches Claude Code headless in a loop until `PROGRESS.md` contains `ALL_PHASES_DONE`, and sleeps/retries when the usage limit is hit. Every session starts with a fresh context, so **state lives only in git + `PROGRESS.md`**.

Preflight (first session only, before Phase 1) — decide every permission first, get them all from the owner at once, verify, then start. Follow `.claude/skills/automatic-agentic-run/SKILL.md §1`. For this project the list is at least:
- **GitHub:** push, create/delete branch, Actions read/write (`gh auth login` with `repo` + `workflow`).
- **Figma (Phase 1):** Figma MCP connected **with write access** — verify by creating and deleting a scratch file/page.
- **Local tooling:** Node 22, pnpm, Playwright browsers installed.
- External services (SMTP/SMS/WhatsApp/S3/Drive/GA4/Vercel): **not needed** — tests use fakes; record as "not required".
**If the owner declines a permission, skip only the work that needs it and do everything else** (e.g. no Figma → skip Phase 1 design, go to Phase 2; no push → local commits only, local gate). Log it under `PROGRESS.md › Skipped`. Record `Preflight: done <date>` + granted/skipped list in `PROGRESS.md`.

Session start (every time):
1. `git status` / `git log -3`, read `PROGRESS.md` (top section only). Resume exactly at the `Now:` line. Don't redo finished work.
2. If on a phase branch with uncommitted changes from a cut-off session: run tests, keep what passes, continue.

Per-phase loop (PR-based — **never commit/push to `main`**; follow `.claude/skills/automatic-agentic-run/SKILL.md §4`):
```
one work branch + one PR → main (opened at the first phase; CI runs on the PR)
implement (TDD) → pnpm verify
  red  → fix → pnpm verify            (repeat)
  green→ commit → git push → wait for the PR's CI run on that sha
            red  → read failed job logs → fix → commit → push → wait (repeat)
            green→ tick phase in PROGRESS.md "phase N done <sha>" + add a "### Phase N" section to the PR body → commit+push → next phase on the same PR
```
- PR not merged → keep stacking phases on it (one PR may carry all phases). Owner merges when ready; if merged, continue on a new branch + new PR from fresh `main`.
- `pnpm verify` = `lint && typecheck && build && test:all-with-merged-coverage` (fails unless merged coverage is 100% on every metric — §8) — define it in Phase 2 together with `.github/workflows/ci.yml` running the same script (Postgres not needed: PGlite).
- **Checkpoint often:** commit + push WIP at each passing sub-step and update `PROGRESS.md › Now:` (one line: phase, step, next action). A session can be cut off at any moment by the usage limit; at most one step may be lost.
- **Never cheat to green:** do not skip, delete, `.only`, weaken assertions, or lower coverage thresholds; do not disable lint rules or CI steps. Fix the code (or the test, if the test is genuinely wrong — log why in Decisions).
- **BLOCKED rule:** after 6 fix rounds on the same failure, write `BLOCKED: <phase> — <reason> — <what the human must do>` as the first line of `PROGRESS.md`, commit, push, and end the session. The autopilot script stops on `BLOCKED`.
- External services (SMTP, SMS, WhatsApp, S3, Drive, GA4, Figma): code against ports; tests use fakes. Never block a phase on real credentials.
- After Phase 9 is green: write `ALL_PHASES_DONE <sha>` as the first line of `PROGRESS.md`, commit, push, end.
