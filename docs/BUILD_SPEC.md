# BUILD_SPEC — Root Logic Commerce (configurable e-commerce for small businesses)

> Agent: this file is the single source of truth (v1 + v2 merged). Read it once; then jump to the § / feature ID you need.
> Notation (§12–§14): `→` then/produces · `|` or · `!` must · `opt` owner toggle · `[Pro]` paid entitlement · `[AI]` metered. Each bullet = acceptance criterion with ≥ 1 test.
> Do not re-read it whole; jump to the § you need. Owner: Root Logic Lab.

---

## §0 Agent operating rules (token + code economy) — follow strictly

1. **First action:** create `CLAUDE.md` (≤40 lines) = §0 + §2 stack + §4 folder map + commands. Create `PROGRESS.md` (checklist of §9 phases). Never paste this spec into other files.
2. **Fully autonomous (§11):** run all remaining phases (§9) back to back with no human gates. A phase is complete only when local checks **and** GitHub CI are green; then commit, push, tick `PROGRESS.md`, start the next phase. Stop only when all phases are done (or §11 BLOCKED rule).
3. **Read narrowly:** use grep/glob to locate, read only needed line ranges, never re-read a file you just wrote. No repo-wide dumps.
4. **Edit, don't rewrite:** use targeted edits; never regenerate a whole file to change a few lines.
5. **Terse output:** no narration, no restating code in chat, no summaries of unchanged files. End-of-phase report ≤10 lines.
6. **No speculative code:** build only what §5–§8 and §12–§14 require. No unused abstractions, no dead code, no placeholder files.
7. **Comments:** only non-obvious *why*. Never *what*. No banner comments, no JSDoc on obvious functions.
8. **Dependencies:** each new dep must justify itself (size + need). Prefer platform/CSS over libraries. Check bundle impact.
9. **Tests:** TDD — write failing test → implement → refactor. Run only affected tests while iterating (`vitest related`), full suite at phase end. Never declare done without a green run.
10. **Subagents:** only for isolated, parallelizable work (e.g., building 3 themes). Give them the exact § numbers, not the whole spec.
11. **When unsure:** pick the simplest option consistent with this spec, note it in `PROGRESS.md › Decisions` (one line), continue. Never ask the human — there is no one watching.
12. **Evidence, not spec:** `docs/COMPETITOR_GAP_REPORT.md` (read only its §4 design brief, in Phase 10) and `docs/competitor/transcript.md` (don't read).
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

Phases 1–9 (v1 build: scaffold → domain → admin → storefront + 5 themes → messages/insights/promotions → hardening/deploy → `new-theme` skill → autopilot skill) are **done** (PR #2, `ALL_PHASES_DONE 6ffd887`). Their acceptance lives in §5–§8 and stays binding; don't redo them — extend them. Remaining phases run **back to back with no approval stop**: the owner reviews the finished result and fixes afterwards.

### Phase 10 — Single merged Figma design (redo)
File `https://www.figma.com/design/1NGfJz6PU8rxZ5pHgIcrsr`. One design covering **everything in §5 + §13** (one product, one design). Brief: `docs/COMPETITOR_GAP_REPORT.md` §4 only.

**Page structure — exactly these 9 Figma pages, in this order, nothing else:**
| # | Page | Content |
|---|---|---|
| 1 | Cover | Product name, theme overview cards, page index, version/date |
| 2 | Foundation | Variables (tokens §6 × modes: 5 themes × light/dark), type scale (EN + বাংলা pairing per theme), 4-pt spacing, radii, icons, demo photo assets, **all components** (§10.1 list) with variants/states |
| 3 | Core design | **Every** screen (§10.2 list), default theme `minimal` light, real content, EN (+ বাংলা variants where listed). Four sections: **Web 1440 › Public site**, **Web 1440 › Admin site**, **Mobile 390 › Public site**, **Mobile 390 › Admin site** |
| 4 | Theme · Minimal | Major screens (§10.3) re-themed via variable mode; same 4 sections |
| 5 | Theme · Organic | same |
| 6 | Theme · Attar | same (dark midnight + gold) |
| 7 | Theme · Ankito | same |
| 8 | Theme · Attar Aloy | same (light blush/rose) |
| 9 | Docs | How to read the file, token → CSS-variable map, component usage notes, section registry ↔ frames map, feature-ID ↔ frame index, changelog |

- **Clean-up first:** move anything reusable from existing pages (`Minimal`, `Organic`, `Attar`, `Ankito`, `Attar Aloy`, `v2 · Foundations`, `v2 · Storefront`, `v2 · Layout gallery`, `v2 · Admin`, `v2 · Assets`) into the 9 pages above, then **delete every page and stray frame not in the table** (no duplicates, no "v2" prefixes, no scratch). Assets → Foundation › Assets.
- Each section: frames on a grid, named `<Area>/<Screen>[/<state>]` (e.g. `Public/Product/sticky-bar`), left→right in user-flow order, section title label. Frames use components + variables only (no detached styles).
- Theme pages differ only by variable mode (+ theme-specific slot layouts); never redraw by hand.
- Real imagery (Foundation › Assets); no placeholder circles/grey boxes.

**10.1 Components (Foundation):** button set + order-path group (Add to cart, Order now, WhatsApp, Call; বাংলা CTA), input/select/textarea/checkbox/radio/toggle/slider (all states), badge tones, lock badge + unlock CTA, help hint (EN/BN), status chips (all 15 statuses), payment chip, fraud pill, courier badge, rating stars, urgency line, product card (4 styles × toggles), variant picker (chips, swatches, multi-select "Selected" list), FBT list, bundle/combo card, **reel card + reel carousel + reel overlay player**, trust strip + certificate modal, help bubble (collapsed/expanded), mini-cart pill, announcement bar, hero slide, bottom nav, sticky buy bar, coupon field, district/thana picker + auto-zone chip, location share, social-proof toast, popups (welcome, product promo, exit-intent), countdown, AI chat panel (chips, product cards, cart-added, order summary confirm, try-on progress/result, quota reached), admin shell (Simple/Pro sidebar, top bar: ⌘K, AI, New order, bell, dark), ⌘K palette, data table + order row (F12) + drawer, bulk-action bar, filter bar, stat tile, chart, empty state, toast, confirm dialog, AI confirm-before-apply card, usage meter, upload field with size hint, live-preview frame (mobile/desktop toggle).

**Reel carousel (B4) — must match the reference shown in the competitor video (home section "Result You Can See, Confidence You Can Feel", 02:06 / 30:24 / 30:15):** horizontal **cover-flow**: centre card largest and fully opaque, neighbours progressively smaller and faded (≈7 visible desktop, 3 mobile), vertical 9:16 cards with rounded corners, caption at top, mute/sound icon, play icon on centre, bottom "Shop now" pill with linked product thumbnail; swipe/drag + arrows; centre auto-plays muted; tap → full overlay player with linked products' Order now. Show it on: Foundation (component + states), Core design (Home web + mobile, Product page, Landing page, overlay player, admin Reels manager: add by upload or FB/IG/TikTok/YT link, cover, caption, products, sort), and the Home screen of every theme page.

**10.2 Core design — all screens.**
*Public (web + mobile):* Home (every B5 block incl. reels carousel, combos, flash sale, trust strip, screenshot reviews, brands, budget bands, FB follow, newsletter) · Category/listing (A11 filters, sort, grid toggle, breadcrumbs) · Search (+ empty) · Product (A1–A12, A16, B2 sticky bar, B4 reels, size-chart modal, review form) · Cart drawer · Checkout (C1 restore, C2, C4/C17, C5, C6, C18, C19, OTP step) · OTP · Order success / Thank-you (C10, upsell popup) · Track order (+ result) · Wishlist · Flash sale · Brand page · Combo page · Landing pages (≥ 2 designs, pack offers, exit-intent) · CMS page (J8) · Blog list/post · Review submit · Back-in-stock / pre-order states · AI chat + chat-to-order + try-on flow · Popups + toast · Layout preview banner · 404 · Offline/error.
*Admin (web + mobile):* Login · First-login checklist · Dashboard (stats incl. profit, courier cost, incomplete, by-courier) · Orders list (all statuses, F12 row, bulk bar) · Order drawer/detail · New/manual order · Incomplete orders · Invoice + packing slip designs · Returns/exchange · Products list · Product editor (variants, badges, specs/how-to/FAQ/benefits, size chart, SEO, media hints, reels link) · CSV import · Categories (drag tree) · Brands · Size charts · Reviews moderation + screenshot reviews · Stock · Combos · Coupons · Flash sales · Popups · Reels manager · Promotions/banners · Landing-page list + editor · Customers CRM + profile · Follow-ups · Courier settings · Courier dashboard · Parcel scan (hand-over + returns) · Fraud/blocklist report · Messages settings + templates · Campaigns · Re-order reminders · Review requests · Design editor (every J1 tab with live preview) · Layout gallery + switch dialog · Language texts · CMS pages · SEO · Tracking (H1–H3) · Feature toggles · Plan/premium locks · Users & roles · Auto-assign + staff report · Activity log · Notifications · ⌘K · Expenses · Profit calculator (+ history/compare) · Reports · Backups · Payments settings · AI Knowledge · AI usage & limits · Do it with AI (+ voice) · POS · Purchases/suppliers · Office/HR (attendance, worker profile, payroll) · Affiliates · Help center (+ video guides) · Settings. **বাংলা variants:** Dashboard, Orders, Checkout, AI Knowledge.

**10.3 Major screens (theme pages):** Public: Home (with reels carousel), Category, Product, Cart drawer, Checkout, Thank-you, Landing page · Admin: Login, Dashboard, Orders + drawer, Product editor, Design editor. Each in web + mobile; Home also in the theme's alternate light/dark mode.

Then update `design/README.md` (page table, token map, frame index by feature ID); continue to Phase 11 without waiting.

### Phase 11 — Foundations
J5, entitlements for all paid IDs, sections registry + layout, J2, J3, J1, J4, J8, admin shell (§12.2) + F1 + F2 + F3, B1, B3, B9, B10, B15, existing-build gaps (§13 end).
### Phase 12 — Catalog
A1, A16, A2–A8, A10–A12, A15, B5 (+ B6, B12), product page per §13.
### Phase 13 — Checkout & orders
C1–C7, C10, C12–C19, C21, D1, D3, D4, D5, F4, F12, B2.
### Phase 14 — Courier
E1–E5, D2.
### Phase 15 — Marketing
H1, H2, H3, H10, H5, A9, B4, B7, B8, B11, B13.
### Phase 16 — AI
I7 first, then I1, I2, I6, I5, I3 (§14); record ImageGen provider in Decisions.
### Phase 17 — Growth & business
G1, G2, G3, G6, F5, F6, F7, H6, H7, H8, C8, C9, C11, A13, A14.
### Phase 18 — Extended modules
G4, G5, F8, F9, F10, F11, H4, H9, B14, I4, J6, J7.
### Phase 19 — Hardening & docs
e2e mobile + desktop for every new flow, Lighthouse with all home blocks on, Spark-size load check, security review (webhooks, uploads, AI prompt injection, blocklist bypass), BN/EN help for every field, README, update `new-theme` and `automatic-agentic-run` skills (sections/layouts, lessons), `docs/SKILL_FEEDBACK.md`. Final report.

**Out of scope:** customer accounts (wishlist is device-local), multi-currency, marketplace.

---

## §10 Definition of done (each phase)
- [ ] `pnpm verify` green locally (lint, typecheck, unit+integration with coverage gate, build, e2e)
- [ ] GitHub Actions CI green for the pushed commit (`gh run watch`)
- [ ] Coverage thresholds met; new e2e flows pass on mobile + desktop
- [ ] No unused deps/exports (`knip`), no TODOs left without a `PROGRESS.md` entry
- [ ] `PROGRESS.md` ticked (phase + feature IDs), decisions logged, committed on the work branch
- [ ] Theme/layout switch never loses data; demo rows never in reports/feeds/analytics.
- [ ] Every paid feature shows lock state; every external call faked in tests, timed out, idempotent; webhooks signature-verified.
- [ ] AI caps proven under concurrency; cache hit verified; refusal + quota UX e2e with fakes.
- [ ] Each ID in §13 has ≥ 1 test and is ticked in PROGRESS.md; nothing in §13 silently skipped — if dropped, log why in Decisions.

---

## §11 Autopilot (unattended run)

Started by `scripts/autopilot.sh`, which relaunches Claude Code headless in a loop until `PROGRESS.md` contains `ALL_PHASES_DONE`, and sleeps/retries when the usage limit is hit. Every session starts with a fresh context, so **state lives only in git + `PROGRESS.md`**.

Preflight (first session of a run, before its first phase) — decide every permission first, get them all from the owner at once, verify, then start. Follow `.claude/skills/automatic-agentic-run/SKILL.md §1`. For this project the list is at least:
- **GitHub:** push, create/delete branch, Actions read/write (`gh auth login` with `repo` + `workflow`).
- **Figma (Phase 10):** Figma MCP connected **with write access** — verify by creating and deleting a scratch file/page.
- **Local tooling:** Node 22, pnpm, Playwright browsers installed.
- External services (SMTP/SMS/WhatsApp/S3/Drive/GA4/Vercel): **not needed** — tests use fakes; record as "not required".
**If the owner declines a permission, skip only the work that needs it and do everything else** (e.g. no Figma → skip Phase 10, go to Phase 11; no push → local commits only, local gate). Log it under `PROGRESS.md › Skipped`. Record `Preflight: done <date>` + granted/skipped list in `PROGRESS.md`.

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
- After Phase 19 is green: write `ALL_PHASES_DONE <sha>` as the first line of `PROGRESS.md`, commit, push, end.

---

## §12 Extension rules, concepts, data, ports

### 12.1 Rules (add to §0)

1. **Personal themes stay.** New UI = token-only sections/slots; works in all 5 themes × light/dark × EN/বাংলা × 390/1440.
2. **Original design** — build the capability, never copy competitor layout/copy/colours/assets.
3. **Every module switchable** (`store_features`) + entitlement-gated if paid (§5.10: visible, lock badge, unlock CTA).
4. **External services behind ports**, fake adapters in tests, no network in `pnpm verify`; per-store creds AES-GCM (§6); every call has timeout + retry/backoff via outbox where it sends.
5. **Perf unchanged with all home blocks on** (Lighthouse mobile ≥ 95, initial JS ≤ 90 KB gz). Heavy widgets (reels, maps, chat, FB, 3rd-party players) load on tap/idle; their CSP hosts only when the block is on.
6. **Money/limits atomic** (`UPDATE … WHERE remaining >= n RETURNING`), fail closed: stock, coupons, gift cards, points, AI quotas.
7. **Help everywhere** (§5.9): each new field → `<HelpHint>` EN/BN, empty state, upload size hint, confirm on destructive.
8. Commit scope cites IDs: `feat(orders): incomplete orders (C1)`. Tick IDs in `PROGRESS.md` as done.
9. **Before each phase**: grep code for the IDs it lists; skip what exists, note it.

### 12.2 Concepts

- **Theme vs Layout.** Theme = tokens + slots (exists). Layout preset = ordered sections for home/product/checkout per niche: general, fashion, gadget, grocery/organic, cosmetics, kitchen, perfume/attar, clothing/panjabi, baby, electronics, watch. Any layout × any theme.
- **Sections registry** `src/sections/<id>/{schema.ts,render.tsx,admin.tsx,sample.ts}`: Zod settings, RSC renderer (tokens only), admin form, sample data. Page = `[{sectionId, settings, enabled}]` in `site_settings.layout` (jsonb, versioned). Used by home, product page, landing pages.
- **Demo packs** `src/demo/<niche>/` (JSON + royalty-free images, licence noted) → preview + switch. Demo rows `is_demo=true`, excluded from reports/analytics/feeds/sitemap.
- **Preview mode**: signed cookie, owner-only, banner "Only you see this — Use this | Exit preview".
- **Admin shell**: *Simple* (Orders, Products, Stock, Messages, Design, Reports, Help, Settings) | *Pro* (all), grouped nav, ⌘K, AI button, New order, notifications, dark mode.

### 12.3 Data model additions (to §7.4)
3NF, `store_id` + index, money minor units, unique `(store_id, slug|code)` where named.
`store_features` · `brands` · `product_options`, `product_variants`(option values, price, compare_at, cost, stock, sku, media_id, sort) · `product_badges` · product jsonb (Zod): `specs[]`, `faqs[]`, `howTo[]`, `benefits[]`, `sizeChartId` · `size_charts` · `reviews`(product, order?, rating, text, media[], status, source web|screenshot|import) · `related_products` · `bundles`, `bundle_items` · `wishlists`(device) · `pages` (CMS) ·
`coupons`, `coupon_redemptions` · `shipping_rules` · `geo_districts`, `geo_thanas` (seed) · `checkout_drafts` · orders +: `source`, `second_phone`, `email`, `note`, `gift_wrap`, `gps_url`, `gps_accuracy_m`, `ip`, `isp`, `device_id`, `assigned_to`, `courier`, `tracking_id`, `courier_status`, `paid_amount`, `payment_ref`, `deleted_at`, `scheduled_for` · `status_rules` · `blocklist`(ip|device|phone) · `fraud_checks` ·
`courier_accounts`, `courier_shipments`, `courier_events`, `parcel_handovers`(+items) · `activity_log`(actor, actor_ip, entity, action, before, after, undo_of) · `notifications` · `follow_ups` · `customer_notes`, `customer_tags` · `expenses` · `profit_calcs` · `landing_pages` · `popups` · `flash_sales` · `reels`(source upload|facebook|instagram|tiktok|youtube, url, media_id, cover_id, caption, sort) + `reel_products` · `campaigns`, `campaign_messages` · `reminders` · `gift_cards` + ledger · `reward_ledger` · `pixel_events` (CAPI outbox) · `ai_knowledge_docs`, `ai_knowledge_chunks` (tsvector + pg_trgm) · `ai_conversations`, `ai_messages` · `ai_usage`(store, feature, period, units, in/out tokens, cost_micros) · `ai_quotas` · `ai_actions` · later: `suppliers`, `purchase_orders`, `pos_shifts`, `staff_*`.

### 12.4 Ports (adapters behind interfaces, fakes in tests)
| Port | First adapters | Must |
|---|---|---|
| `CourierPort` | Steadfast, Pathao, RedX; later CarryBee, eCourier | create parcel, label/tracking id, fetch status, verify webhook; map courier status → order status table |
| `FraudCheckPort` | courier-history provider (pick at Phase 14, log in Decisions) | phone → {total, delivered, returned, %}; cache 24 h |
| `TrackingPort` | Meta CAPI, TikTok Events API | from domain events via `pixel_events` outbox; shared `event_id` with browser; SHA-256 normalised phone/email; retries |
| `PaymentPort` (exists) | bKash, Nagad, SSLCommerz (later EPS, UddoktaPay) | init, verify webhook, refund; partial/advance |
| `LlmPort` | Anthropic `@anthropic-ai/sdk` | §14 |
| `ImageGenPort` | pick at Phase 16 (Claude can't generate images) | §14 quota |
| `SpeechPort` | pick when I4/F11 built | BN speech→text |
| `GeoPort` | seeded BD districts/thanas | offline |

---

## §13 Feature catalogue (ID · priority · plan · acceptance) — extends §5
P0 = sales-critical, P1 = differentiator, P2 = later.

### A Catalog & product page
- **A1 Variants** P0 — options (size, colour, custom) → variant matrix; per-variant price/compare/cost/stock/SKU/image; image switches on pick; out-of-stock chips disabled; §5.4 stock rules per variant (deduct on CONFIRMED, atomic).
- **A16 Multi-variant pick** P0 — shopper selects several combos (e.g. White·M ×1, Maroon·L ×2) → "Selected" list with qty steppers + remove + total → one add-to-cart/Order now.
- **A2 Brands** P1 — CRUD + logo; filter; product field; brand page.
- **A3 Badges** P0 — custom badge per product (text, tone) + auto "Save N%" from compare-at; shown on card + page.
- **A4 Urgency** P0 — "N left" when stock ≤ threshold (opt), "N sold" from delivered+confirmed (opt), rating + review count.
- **A5 Size chart** P1 — reusable charts (table editor) linked to product/category → "See size chart" modal.
- **A6 Content tabs** P0 — Details (rich text), Specifications grid, How to use (numbered steps), FAQ accordion (FAQPage JSON-LD), Key benefits checklist, Why buy checklist; empty tabs hidden.
- **A7 Reviews** P0 — shopper review after delivery (link via order no.+phone), stars/text/photos, moderation queue, owner reply; **screenshot reviews** (owner uploads WhatsApp/Messenger screenshots, carousel "What customers say"); AggregateRating JSON-LD only from real reviews.
- **A8 Related + Frequently bought together** P0 — manual or auto (same category / co-purchased); FBT checkbox list with running total → "Add selected to cart".
- **A9 Combos** P1 [Pro] — bundle of products/variants, bundle price, "N% less", stock = min of items, adds all lines; combos block + page.
- **A10 Wishlist** P1 — device-local, header count, page; move to cart.
- **A11 Listing UX** P0 — filters (price range, brand, variant options, in stock), sort (new, price ↑↓, best selling), per-page, grid 2/3/4 toggle, breadcrumbs (+ BreadcrumbList JSON-LD — **gap in existing build, fix**).
- **A12 Gallery/share** P0 — thumbs (position opt), zoom on hover (desktop), swipe + arrows, fit cover|contain opt, share (FB, WhatsApp, Messenger, copy link), qty stepper.
- **A13 Pre-order** P2 [Pro] — orderable at 0 stock, ETA text, separate status tag.
- **A14 Back-in-stock** P2 [Pro] — "notify me" phone capture → SMS/WhatsApp via outbox on restock.
- **A15 CSV import/export** P1 — products + variants + stock; dry-run preview with row errors; images by URL/Drive link.

### B Storefront conversion
- **B1 Announcement bar** P0 — multiple messages, marquee or rotate, colours, link, close (opt), reduced-motion = static.
- **B2 Order paths** P0 — buttons Add to cart, Order now (skip cart → checkout), WhatsApp order (prefilled msg: product, variant, qty, link), Call to order (tel:); owner toggles + drag order; **mobile sticky buy bar** (price, cart icon, Order now) opt.
- **B3 Hero slider** P0 — N slides (image desktop/mobile, headline, sub, price "From ৳X", CTA, product link), autoplay interval, CSS transitions only (fade|slide), LCP image priority, dots/arrows.
- **B4 Reels carousel** P1 [Pro] — sources: upload mp4/webm, **Facebook Reel, Instagram Reel, TikTok, YouTube Shorts URL** (extend §5.7 parser; reject private/unknown with help); cover required for FB/IG (thumbnails need Meta token); caption, linked products, sort → cover-flow carousel exactly as designed in Phase 10 (centre card large, neighbours smaller + faded; CSS scroll-snap + transforms, no lib) → tap opens overlay player (upload: native, muted autoplay only in view; others: official player loaded on tap) + linked products' Order now; sections: home, product page (reels of that product), landing.
- **B5 Home section builder** P0 — drag order, on/off, counts per section; blocks: slider, categories (image tiles), editor's picks, per-category rows (+ "View all" / "Shop X →"), brands, budget bands (B12), reels, combos, flash sale, screenshot reviews, trust strip (B6), FB page follow, newsletter (B13), custom HTML-free rich text, image banner, video.
- **B6 Trust strip** P0 — "Verified business": trade licence, TIN, BIN, e-Commerce DBID, warranty/replacement policy; each with number + certificate image → modal viewer; on home, product, checkout, thank-you, footer.
- **B7 Social proof toast** P1 [Pro] — from real confirmed orders only (first name + area + product + time ago), frequency cap, off on checkout, dismiss remembered.
- **B8 Popups** P1 [Pro] — types: welcome/offer, product promo (product card, price, discount, free delivery, Buy | Not now), exit-intent (landing/checkout: "Your order isn't finished"), newsletter; rules: pages, delay/scroll/exit, once per N days, mobile/desktop.
- **B9 Help bubble** P0 — one floating button → WhatsApp, Messenger, Call, AI chat (if on); position opt; replaces scattered floating buttons; plus back-to-top.
- **B10 Mobile bottom nav** P0 — Track, Wishlist, Home, Menu, Account/Cart; items opt.
- **B15 Floating mini-cart** P1 — count + total pill (desktop side / mobile bar) → opens cart drawer.
- **B11 Flash sale** P1 [Pro] — start/end, products + sale price/%, stock cap, countdown on card/page/header button, `/flash-sale` page, auto-revert.
- **B12 Shop by budget** P2 — owner-defined price bands → filtered listing.
- **B13 Newsletter/phone capture** P2 — consent text; to customers with tag.
- **B14 Blog** P2 [Pro] — posts, categories, SEO, product links.
- **J8 CMS pages** P0 — About, Return policy, Privacy, Terms, Contact (+ custom); rich text; footer links; seeded EN/BN templates.

### C Checkout & orders
- **C1 Incomplete orders** P0 — debounced draft save once a valid BD phone is typed (consent line under form) → `checkout_drafts`; "What you typed is still here" restore on return; admin "Incomplete" tab with call/WhatsApp, convert to order, auto-assign (F6); purge after 30 days; never counted as orders/revenue.
- **C2 Coupons** P0 — %, fixed, free shipping; min subtotal, product/category scope, start/end, total + per-phone limits, auto-apply opt; atomic redemption; checkout field "Have a code?".
- **C3 Free-shipping rules** P1 — by subtotal, product, zone; shown as progress hint in cart.
- **C4 District/thana** P1 — address mode opt: free text + zone radio | district→thana pickers (searchable, BN/EN); per-district/zone charge table; **C17 auto zone detect** from typed address (e.g. "Dhaka" → Inside Dhaka) with visible chip; hint to include thana/upazila.
- **C5 Share location** P1 — optional GPS (permission prompt on tap only) → Maps link + accuracy shown in admin.
- **C6 Extra fields** P0 — second phone, email (opt / required opt), delivery note, preferred time, gift wrap opt; section titles opt.
- **C7 Limits** P1 — min/max qty per product, min/max order value.
- **C8 Gift cards** P2 [Pro] — issue/sell, code, balance ledger, redeem at checkout, partial use.
- **C9 Reward points** P2 [Pro] — earn on DELIVERED, redeem rate, expiry, reversal on return.
- **C10 Thank-you builder** P1 — texts (heading, sub, message), colours, buttons: Back home, Print invoice, WhatsApp confirm; upsell popup (B8); trust strip.
- **C11 Online payment** P1 [Pro] — bKash, Nagad, SSLCommerz via PaymentPort; full or advance (e.g. delivery charge) then COD remainder; webhook-verified; `paid_amount`, `payment_ref`, Paid/Unpaid/Due chip.
- **C12 Manual order** P0 — admin "New order" (phone/WhatsApp/shop orders): product search, variants, customer lookup by phone, zone, discount, source.
- **C13 Statuses** P0 — add ON_HOLD, SCHEDULED (`scheduled_for`), COURIER_HOLD, PARTIAL_DELIVERED, RETURNING, RETURN_RECEIVED, RETURN_MISSING + soft-delete Trash; domain transition table; stock rules: restock on RETURN_RECEIVED (not RETURNING), partial delivery restocks undelivered lines.
- **C21 Status rules** P1 — e.g. RETURNING > N days unscanned → RETURN_MISSING; SCHEDULED due → PENDING + notify; cron, logged as actor `system`.
- **C14 Returns/exchange** P1 — request, reason, items, exchange order link, refund record.
- **C15 Source** P0 — web, landing, chat, voice, POS, manual, import; filter + tag on row.
- **C16 Invoices** P1 — ≥ 3 designs, logo, BN/EN, bulk print, packing slip with order barcode/QR, 80 mm thermal option.
- **C18 Checkout cart edit** P0 — qty/remove lines in checkout (confirm on remove), totals live.
- **C19 Checkout CTA** P0 — localized big button ("এখনই অর্ডার করুন"), processing state, trust lines under it, double-submit guard.

### D Order guard & fraud
- **D1 Duplicates** P0 — same phone (+ similar product) within N h → flag "Possible duplicate of #x (status, age)" on row; opt block.
- **D2 Courier score** P0 [Pro] — FraudCheckPort % per phone on row + drawer (total/delivered/returned); threshold → hold/OTP-required rule opt.
- **D3 Blocklist** P0 — block/unblock IP, device id (first-party cookie + fingerprint-free id), phone from drawer; blocked → friendly refusal; log.
- **D4 Rate limits** P0 — orders per phone/IP/device per window (opt values).
- **D5 Report** P1 — blocked attempts, flagged orders, top risky numbers.

### E Courier & fulfilment [Pro]
- **E1 Integrations** P0 — per-store courier accounts (API keys encrypted), default courier, pickup store; send single/bulk → tracking id + label; COD amount = due.
- **E2 Sync** P0 — webhook + cron poll → `courier_events` → mapped order status (Shipped, Delivered, Partial, Returning, Courier hold); raw courier status shown on row.
- **E3 Courier dashboard** P1 — per courier: sent, on the way, delivered, returned, success %, avg days; date/product filters.
- **E4 Parcel scan** P1 — hand-over session: choose courier, rider name/phone, scan box barcodes (camera `BarcodeDetector` + manual input; scanner gun = keyboard) → printable hand-over receipt for signatures; returns scan session → RETURN_RECEIVED; "what came back / what didn't" report.
- **E5 Reconciliation** P1 — courier charge + COD collected per shipment, payout tracking, courier cost on dashboard.

### F Admin productivity & team
- **F1 ⌘K** P1 — search menus, orders (no./phone), products, customers.
- **F2 Real-time** P0 — new-order toast (SSE/poll), sound opt, notification centre grouped by kind, mark read.
- **F3 Activity log** P0 — every admin/system mutation: actor, IP, time, before→after diff; filter chips by action with counts, date/time range, actor, search; per-order History; **Undo this change** where reversible; retention 30 days opt.
- **F4 Bulk actions** P0 — select rows → status, assign, print invoices/slips, send to courier (per courier), sync status, delete (trash), AI confirm (I5).
- **F5 Follow-ups** P1 — reminder on order/customer (date, note), badge count, list.
- **F6 Auto-assign** P1 [Pro] — rules per status (Incomplete, Pending): ticked staff, round-robin by fewest today, sticky per customer, skip inactive; paid-online orders excluded; "today so far" table; staff report (orders, open, confirmed, shipped, delivered, returned, cancelled, delivered value, confirm rate, delivery success).
- **F7 CRM** P1 — customer list (orders, LTV, last order, return rate, courier score), tags, notes, block, WhatsApp/call.
- **F8 Admin dark mode** P2.
- **F9 Office/HR** P2 [Pro add-on] — staff roles, attendance in/out + breaks + late, lost-time calc, leave/requests/advances approvals, daily reports, targets, salary/payroll + deductions, worker profile month view.
- **F10 Auto-calling** P2 [Pro] — IVR confirm provider port; result sets status.
- **F12 Order row** P0 — compact row: invoice no. + copy, date, source tag, customer + WhatsApp/call/copy, address, products (variant, qty, SKU), status + who set it, fraud %, amount, ship cost, courier + tracking, payment chip, duplicate flag, note; row icons edit/print/history/delete; drawer: status, editable date, second phone, IP/ISP/device + block, "N orders from this device", address edit, GPS map link, payment info, previous orders.

### G Money & reports
- **G1 Expenses** P1 — categories (ads, packaging, salary, rent, other), recurring, attach receipt → dashboard net profit.
- **G2 Profit calculator** P1 — inputs: product, category, cost/unit, price/unit, marketing cost/order, fixed cost/unit, target delivered units → required orders (auto), call-cancel %, return %, delivery income/unit, return loss/unit, note → outputs: net operating profit, margin, ROI, effective CPA, profit/unit, sales performance, revenue + expense breakdown, verdict badge (loss zone…excellent); save, history, compare 2–3.
- **G3 Reports** P1 [Pro] — sales, product, category, customer, staff, courier, slow-moving stock (no sale in N days), stock value; CSV export; daily summary via WhatsApp/email at set time.
- **G4 Purchases/suppliers** P2 [Pro] — PO → receive → stock in + cost update; supplier dues/payments.
- **G5 POS** P2 [Pro] — shift open (opening cash)/close (count), barcode/SKU scan, product grid, discount, Cash/bKash/Nagad/Rocket/Card/Bank, amount received → change, customer phone opt, receipt print, source=POS, stock deducted immediately.
- **G6 Backups UI** P1 — VPS: list nightly dumps, download, on-demand backup; Vercel: provider instructions.

### H Marketing & tracking
- **H1 Meta** P0 — Pixel ID; **who sends events**: this website (browser + CAPI, same event_id) | GTM + server events | GTM only; **Purchase trigger**: placed | confirmed (default, suggested) | delivered, with BN/EN explanation; online-paid orders fire on payment; CAPI token (warning if missing → falls back to placed); test event code; domain verification meta tag; multiple pixels; events ViewContent, AddToCart, InitiateCheckout, Purchase, Search, Contact, Lead.
- **H2 TikTok** P1 — pixel + Events API, same trigger options.
- **H3 Tags** P0 — GTM container id (+ downloadable container JSON with our dataLayer events), GA4 (+ extra properties), Microsoft Clarity, Search Console verification; CSP per enabled tool; GA4 off if GTM sends it (warn double count).
- **H4 Pixel event report** P2 [Pro] — sent/failed per event/day, last errors.
- **H5 Landing pages** P0 [Pro] — list with visitors/orders/conversion, search, design filter, hide; URL prefix opt (e.g. `/offer/`); create: pick product (or variants/packs) + design (≥ 6 token-based designs) → auto-filled; blocks (each show/hide, reorder): hero headline/sub, video, price + countdown, **pack offers** (1/2/3/4 pcs with tiers), problem→solution, why us, comparison table (us vs others), benefits, gallery, certificates, reviews/screenshots, delivery & size chart, FAQ, guarantee, inline checkout (C rules apply), exit-intent popup, sticky order bar, site header/footer opt; inline click-to-edit live preview; copy & edit; AI rewrite (I6).
- **H6 Campaigns** P1 [Pro] — segment (tags, last order, product bought, area) → SMS/Email/WhatsApp template → schedule → outbox; opt-out; cost estimate.
- **H7 Re-order reminders** P1 [Pro] — per product "remind after N days" → message with reorder link; stats: running out now, within 7 days, sent, opened, reordered.
- **H8 Review requests** P1 [Pro] — after DELIVERED + N days → link to A7 form.
- **H9 Affiliates** P2 [Pro] — links, commission, payouts.
- **H10 Product feed** P1 — Facebook/Google catalog XML/CSV per store, variants as items, demo excluded.

### I AI [AI] — see §14 for rules
I1 shop chatbot + owner knowledge · I2 chat-to-order · I3 image try-on (hard caps) · I4 Bangla voice order (P2) · I5 admin "Do it with AI" · I6 copy helpers · I7 usage & limits page (P0, first) · F11 voice input for I5 (P2).

### J Design & platform
- **J1 Section design editor** P0 — tabs, each with live preview (mobile/desktop) + autosave + "Saved" toast: Header (logo size desktop/mobile, favicon, shop name, announcement B1, menu letter case/size, search colours), Menu, Footer (≥ 2 presets, colours, call/WhatsApp card, logo, columns, payment logos, app badge), Product card (design presets, toggles rating/sold/badge/buttons/wishlist/second image on hover, colours), Floating buttons (B9), Product page (A12 gallery opts, **mobile section order drag**, sticky bar, **button visibility + order** B2), Language texts (J4), Checkout (C4 address mode, C6 fields, titles, language), Thank-you (C10), SEO & sharing, Layout (products per row per breakpoint 5/4/3/2, picture shape 1:1|4:5|3:4, per-page counts, related count, page width, currency sign), Mobile menu (B10). Every value has a sensible default from theme.
- **J2 Layout gallery** P0 — card per niche layout (picture + description) → full-site live preview (cookie) → "Use this layout".
- **J3 Switch dialog** P1 — shows counts (yours vs demo): Take mine with me | Hide mine, show demo (nothing deleted) | Keep both | Start fresh (confirm twice); reversible except fresh.
- **J4 Language texts** P1 — override every storefront string EN/BN; Bangla digits opt.
- **J5 Feature toggles** P0 — one page listing modules with on/off + lock state.
- **J6 PWA** P2 → branded Android TWA [Pro].
- **J7 Video guides** P2 — per help topic, YouTube facade.

### Gaps in the existing build (Phase 11)
BreadcrumbList JSON-LD; Google Drive *uploads* (or record "links only" as final); GA4 in admin [Pro]; video duration cap; blurhash (or record dominant-colour decision as final).

---

## §14 AI services (I1–I7, F11)
- **Models** (claude-api skill, cached 2026-11): `AI_CHAT_MODEL` default `claude-opus-5-5` (owner may set `claude-haiku-5-5` for cost — owner's call, log it). Opus 5.5: thinking can't be disabled → `output_config.effort: "low"` for chat, `"medium"` for I5; no assistant prefill; forced `tool_choice` any/tool → 400, use `auto` + `strict: true`; always check `stop_reason` (`refusal`, `max_tokens`) before reading content; enable `betas: ["server-side-fallback-2026-07-01"]` + `fallbacks: "default"`; stream replies; typed SDK errors, no string matching.
- **Caching**: order tools → frozen system (persona, rules) → knowledge block `cache_control` → messages; nothing volatile before last breakpoint; integration test asserts `cache_read_input_tokens > 0` on 2nd call (recorded fixture).
- **I1 Chatbot** — admin **AI → Knowledge**: upload PDF/TXT/MD or paste text (policies, FAQ, care, delivery), status, tokens, enable/disable, delete, size cap per plan. Context = catalog tools + store settings + knowledge (small → whole text cached; large → top chunks via FTS/trgm; pgvector only if measured). PDFs may go as `document` blocks with `citations: {enabled: true}` → show source titles (not with structured outputs). Tools (store id from server, never model): `search_products`, `get_product`, `get_delivery_info`, `track_order(no, phone)`, `add_to_cart`, `start_order`. UI: bubble panel, BN/EN auto, quick-reply chips (delivery charge? size? COD?), product cards with Order now + "How will it look on me?" (I3), cross-sell suggestions, typing state, human handoff (WhatsApp/Messenger). Safety: user text + knowledge = data; never reveal costs, other customers, other stores; refuse off-topic politely.
- **I2 Chat-to-order** — bot adds items, asks name → phone → address → zone, shows summary, shopper taps **Confirm** (real button, model never places orders) → normal order, `source=chat`, guards/OTP apply.
- **I3 Try-on** — consent → upload selfie/room photo → ImageGenPort with product image → "AI preview" label, wait message (~30–40 s) with progress; photos EXIF-stripped, private, deleted ≤ 24 h, never reused. **Caps never exceeded**: per-store monthly (default 20), per-visitor daily (default 2), global `AI_GLOBAL_MONTHLY_BUDGET_USD`; reserve unit atomically before call, refund on provider error, fail closed with BN/EN message; owner sees usage + upgrade CTA; `aiImagePro` raises caps. Concurrency test proves no overshoot.
- **I4 Voice order** (P2) — "Just talk, we order": SpeechPort BN → LLM extracts name/phone/address/zone → fills checkout fields for shopper to confirm; audio kept with order only if consented.
- **I5 Do it with AI** — Messages API + SDK tool runner (`client.beta.messages.toolRunner` + `betaZodTool`) in-app (tools hit tenant use-cases; Managed Agents noted as alternative in Decisions). Read tools: sales today/range, best sellers, stock alerts, staff/courier performance, daily report. Write tools only create `ai_actions` proposals → "Check before it is done" card (what changes, rows, messages to be sent) → owner Confirm runs the normal use-case → activity log + undo. Respects caller role. Answers render tables. F11: mic input via SpeechPort.
- **I6 Copy helpers** — product description, SEO, landing copy "write another way", BN↔EN; one call each, low effort.
- **I7 Usage & limits** — per feature/month: calls, tokens, images, est. cost, caps, bars, upgrade CTA. Entitlements `aiChat`, `aiImage`, `aiImagePro`, `aiAdmin`, `aiVoice`.
- **Tests**: fakes everywhere; quota 100 % covered; opt-in live smoke script outside `pnpm verify` prints cost.
