# BUILD_SPEC_V2 — redesign + competitive feature set

> Agent: sole source of truth for v2. v1 `docs/BUILD_SPEC.md` §0 rules, §2 stack, §3 architecture, §6 config, §7.3 images, §8 non-functionals, §10 DoD, §11 autopilot still apply — don't restate, don't reread whole.
> Read this file once; afterwards jump to the § / feature ID you need. `docs/COMPETITOR_GAP_REPORT.md` = human evidence (timestamps); read only its §4 design brief, in Phase 10.
> Notation: `→` = then/produces · `|` = or · `!` = must · `opt` = owner toggle · `[Pro]` paid entitlement · `[AI]` metered. Each bullet = acceptance criterion; each needs a test (unit/integration/e2e as fits).

---

## §0 Rules (add to v1 §0)

1. **Phase 10 (Figma) → hard STOP** for owner approval.
2. **Personal themes stay.** New UI = token-only sections/slots; works in all 5 themes × light/dark × EN/বাংলা × 390/1440.
3. **Original design** — build the capability, never copy competitor layout/copy/colours/assets.
4. **Every module switchable** (`store_features`) + entitlement-gated if paid (v1 §5.10: visible, lock badge, unlock CTA).
5. **External services behind ports**, fake adapters in tests, no network in `pnpm verify`; per-store creds AES-GCM (v1 §6); every call has timeout + retry/backoff via outbox where it sends.
6. **Perf unchanged with all home blocks on** (Lighthouse mobile ≥ 95, initial JS ≤ 90 KB gz). Heavy widgets (reels, maps, chat, FB, 3rd-party players) load on tap/idle; their CSP hosts only when the block is on.
7. **Money/limits atomic** (`UPDATE … WHERE remaining >= n RETURNING`), fail closed: stock, coupons, gift cards, points, AI quotas.
8. **Help everywhere** (v1 §5.9): each new field → `<HelpHint>` EN/BN, empty state, upload size hint, confirm on destructive.
9. Commit scope cites IDs: `feat(orders): incomplete orders (C1)`. Tick IDs in `PROGRESS.md` as done.
10. **Before each phase**: grep code for the IDs it lists; skip what exists, note it.

---

## §1 Concepts

- **Theme vs Layout.** Theme = tokens + slots (exists). Layout preset = ordered sections for home/product/checkout per niche: general, fashion, gadget, grocery/organic, cosmetics, kitchen, perfume/attar, clothing/panjabi, baby, electronics, watch. Any layout × any theme.
- **Sections registry** `src/sections/<id>/{schema.ts,render.tsx,admin.tsx,sample.ts}`: Zod settings, RSC renderer (tokens only), admin form, sample data. Page = `[{sectionId, settings, enabled}]` in `site_settings.layout` (jsonb, versioned). Used by home, product page, landing pages.
- **Demo packs** `src/demo/<niche>/` (JSON + royalty-free images, licence noted) → preview + switch. Demo rows `is_demo=true`, excluded from reports/analytics/feeds/sitemap.
- **Preview mode**: signed cookie, owner-only, banner "Only you see this — Use this | Exit preview".
- **Admin shell v2**: *Simple* (Orders, Products, Stock, Messages, Design, Reports, Help, Settings) | *Pro* (all), grouped nav, ⌘K, AI button, New order, notifications, dark mode.

---

## §2 Data model additions
3NF, `store_id` + index, money minor units, unique `(store_id, slug|code)` where named.
`store_features` · `brands` · `product_options`, `product_variants`(option values, price, compare_at, cost, stock, sku, media_id, sort) · `product_badges` · product jsonb (Zod): `specs[]`, `faqs[]`, `howTo[]`, `benefits[]`, `sizeChartId` · `size_charts` · `reviews`(product, order?, rating, text, media[], status, source web|screenshot|import) · `related_products` · `bundles`, `bundle_items` · `wishlists`(device) · `pages` (CMS) ·
`coupons`, `coupon_redemptions` · `shipping_rules` · `geo_districts`, `geo_thanas` (seed) · `checkout_drafts` · orders +: `source`, `second_phone`, `email`, `note`, `gift_wrap`, `gps_url`, `gps_accuracy_m`, `ip`, `isp`, `device_id`, `assigned_to`, `courier`, `tracking_id`, `courier_status`, `paid_amount`, `payment_ref`, `deleted_at`, `scheduled_for` · `status_rules` · `blocklist`(ip|device|phone) · `fraud_checks` ·
`courier_accounts`, `courier_shipments`, `courier_events`, `parcel_handovers`(+items) · `activity_log`(actor, actor_ip, entity, action, before, after, undo_of) · `notifications` · `follow_ups` · `customer_notes`, `customer_tags` · `expenses` · `profit_calcs` · `landing_pages` · `popups` · `flash_sales` · `reels`(source upload|facebook|instagram|tiktok|youtube, url, media_id, cover_id, caption, sort) + `reel_products` · `campaigns`, `campaign_messages` · `reminders` · `gift_cards` + ledger · `reward_ledger` · `pixel_events` (CAPI outbox) · `ai_knowledge_docs`, `ai_knowledge_chunks` (tsvector + pg_trgm) · `ai_conversations`, `ai_messages` · `ai_usage`(store, feature, period, units, in/out tokens, cost_micros) · `ai_quotas` · `ai_actions` · later: `suppliers`, `purchase_orders`, `pos_shifts`, `staff_*`.

## §3 Ports
| Port | First adapters | Must |
|---|---|---|
| `CourierPort` | Steadfast, Pathao, RedX; later CarryBee, eCourier | create parcel, label/tracking id, fetch status, verify webhook; map courier status → order status table |
| `FraudCheckPort` | courier-history provider (pick at Phase 14, log in Decisions) | phone → {total, delivered, returned, %}; cache 24 h |
| `TrackingPort` | Meta CAPI, TikTok Events API | from domain events via `pixel_events` outbox; shared `event_id` with browser; SHA-256 normalised phone/email; retries |
| `PaymentPort` (exists) | bKash, Nagad, SSLCommerz (later EPS, UddoktaPay) | init, verify webhook, refund; partial/advance |
| `LlmPort` | Anthropic `@anthropic-ai/sdk` | §AI |
| `ImageGenPort` | pick at Phase 16 (Claude can't generate images) | §AI quota |
| `SpeechPort` | pick when I4/F11 built | BN speech→text |
| `GeoPort` | seeded BD districts/thanas | offline |

---

## §4 Features (ID · priority · plan · acceptance)
P0 = sales-critical, P1 = differentiator, P2 = later.

### A Catalog & product page
- **A1 Variants** P0 — options (size, colour, custom) → variant matrix; per-variant price/compare/cost/stock/SKU/image; image switches on pick; out-of-stock chips disabled; v1 stock rules per variant (deduct on CONFIRMED, atomic).
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
- **A11 Listing UX** P0 — filters (price range, brand, variant options, in stock), sort (new, price ↑↓, best selling), per-page, grid 2/3/4 toggle, breadcrumbs (+ BreadcrumbList JSON-LD — **v1 gap, fix**).
- **A12 Gallery/share** P0 — thumbs (position opt), zoom on hover (desktop), swipe + arrows, fit cover|contain opt, share (FB, WhatsApp, Messenger, copy link), qty stepper.
- **A13 Pre-order** P2 [Pro] — orderable at 0 stock, ETA text, separate status tag.
- **A14 Back-in-stock** P2 [Pro] — "notify me" phone capture → SMS/WhatsApp via outbox on restock.
- **A15 CSV import/export** P1 — products + variants + stock; dry-run preview with row errors; images by URL/Drive link.

### B Storefront conversion
- **B1 Announcement bar** P0 — multiple messages, marquee or rotate, colours, link, close (opt), reduced-motion = static.
- **B2 Order paths** P0 — buttons Add to cart, Order now (skip cart → checkout), WhatsApp order (prefilled msg: product, variant, qty, link), Call to order (tel:); owner toggles + drag order; **mobile sticky buy bar** (price, cart icon, Order now) opt.
- **B3 Hero slider** P0 — N slides (image desktop/mobile, headline, sub, price "From ৳X", CTA, product link), autoplay interval, CSS transitions only (fade|slide), LCP image priority, dots/arrows.
- **B4 Reels carousel** P1 [Pro] — sources: upload mp4/webm, **Facebook Reel, Instagram Reel, TikTok, YouTube Shorts URL** (extend v1 §5.7 parser; reject private/unknown with help); cover required for FB/IG (thumbnails need Meta token); caption, linked products, sort → 9:16 swipe carousel (CSS scroll-snap, no lib) → tap opens overlay player (upload: native, muted autoplay only in view; others: official player loaded on tap) + linked products' Order now; sections: home, product page (reels of that product), landing.
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

### I AI [AI] — see §AI for rules
I1 shop chatbot + owner knowledge · I2 chat-to-order · I3 image try-on (hard caps) · I4 Bangla voice order (P2) · I5 admin "Do it with AI" · I6 copy helpers · I7 usage & limits page (P0, first) · F11 voice input for I5 (P2).

### J Design & platform
- **J1 Section design editor** P0 — tabs, each with live preview (mobile/desktop) + autosave + "Saved" toast: Header (logo size desktop/mobile, favicon, shop name, announcement B1, menu letter case/size, search colours), Menu, Footer (≥ 2 presets, colours, call/WhatsApp card, logo, columns, payment logos, app badge), Product card (design presets, toggles rating/sold/badge/buttons/wishlist/second image on hover, colours), Floating buttons (B9), Product page (A12 gallery opts, **mobile section order drag**, sticky bar, **button visibility + order** B2), Language texts (J4), Checkout (C4 address mode, C6 fields, titles, language), Thank-you (C10), SEO & sharing, Layout (products per row per breakpoint 5/4/3/2, picture shape 1:1|4:5|3:4, per-page counts, related count, page width, currency sign), Mobile menu (B10). Every value has a sensible default from theme.
- **J2 Layout gallery** P0 — card per niche layout (picture + description) → full-site live preview (cookie) → "Use this layout".
- **J3 Switch dialog** P1 — shows counts (yours vs demo): Take mine with me | Hide mine, show demo (nothing deleted) | Keep both | Start fresh (confirm twice); reversible except fresh.
- **J4 Language texts** P1 — override every storefront string EN/BN; Bangla digits opt.
- **J5 Feature toggles** P0 — one page listing modules with on/off + lock state.
- **J6 PWA** P2 → branded Android TWA [Pro].
- **J7 Video guides** P2 — per help topic, YouTube facade.

### V1 gaps to close (Phase 11)
BreadcrumbList JSON-LD; Google Drive *uploads* (or record "links only" as final); GA4 in admin [Pro]; video duration cap; blurhash (or record dominant-colour decision as final).

---

## §AI
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

---

## §5 Phases (in order; v1 §10 DoD each)

**Phase 10 — Figma redesign → STOP.** File `https://www.figma.com/design/1NGfJz6PU8rxZ5pHgIcrsr`; keep existing pages, add v2 pages. Brief: gap report §4 (calm commerce: one urgency line, slim trust strip, one help bubble, real social proof only, story-order product page, BN/EN type pairing, Simple/Pro admin, CSS-only motion). Real niche photography/illustration, no placeholder shapes.
- Foundations v2: tokens for badges, urgency, rating, sticky bar, popup, toast, status chips (15), fraud pill, courier badge; components for every A/B/C/E/F/I UI element above (variant picker incl. multi-select list, FBT list, reel card + overlay, trust strip + certificate modal, help bubble, mini-cart, coupon, district/thana, location share, AI chat panel states: chips, product cards, try-on progress/result, quota reached; ⌘K, bulk bar, order row + drawer, confirm-before-apply card).
- Storefront Web 1440 + Mobile 390, ≥ 2 themes, light + dark: Home (all B5 blocks), Category (A11), Product (A1–A12, B2 sticky, B4), Checkout v2 (C1–C6, C17–C19), Thank-you v2, Landing (2 designs), Flash sale, Wishlist, CMS page, popups (B8), social-proof toast, AI chat + try-on.
- Layout gallery (≥ 6 niches) + preview banner + switch dialog.
- Admin Web + Mobile: Simple/Pro nav, Dashboard v2, Orders v2 (row + drawer + bulk), New order, Incomplete, Courier settings + dashboard + parcel scan, Coupons, Reviews, Design v2 (J1 tabs), Layout gallery, Landing editor, AI Knowledge, AI usage, Do-it-with-AI, Tracking settings (H1–H3), Activity log, CRM, Expenses, Profit calculator, Feature toggles, Auto-assign. EN + বাংলা for Orders v2 and AI Knowledge.
- Report link + ≤ 10 lines. **Wait.**

**Phase 11 — Foundations:** J5, entitlements, sections registry + layout, J2, J3, J1, J4, J8, admin shell v2 + F1 + F2 + F3, B1, B3, B9, B10, B15, V1 gaps.
**Phase 12 — Catalog:** A1, A16, A2–A8, A10–A12, A15, B5 (+ B6, B12), product page v2.
**Phase 13 — Checkout & orders:** C1–C7, C10, C12–C19, C21, D1, D3, D4, D5, F4, F12, B2.
**Phase 14 — Courier:** E1–E5, D2.
**Phase 15 — Marketing:** H1, H2, H3, H10, H5, A9, B4, B7, B8, B11, B13.
**Phase 16 — AI:** I7 first, then I1, I2, I6, I5, I3; record ImageGen provider.
**Phase 17 — Growth & business:** G1, G2, G3, G6, F5, F6, F7, H6, H7, H8, C8, C9, C11, A13, A14.
**Phase 18 — Optional (only IDs the owner ticks in PROGRESS.md):** G4, G5, F8, F9, F10, F11, H4, H9, B14, I4, J6, J7.
**Phase 19 — Hardening:** e2e mobile+desktop for every new flow, Lighthouse with all blocks on, Spark-size load check, security review (webhooks, uploads, AI prompt injection, blocklist bypass), BN/EN help for every field, README + `new-theme` skill updated for sections/layouts, final report.

## §6 Acceptance (beyond v1 §10)
- Theme/layout switch never loses data; demo rows never in reports/feeds/analytics.
- Every paid feature shows lock state; every external call faked in tests, timed out, idempotent; webhooks signature-verified.
- AI caps proven under concurrency; cache hit verified; refusal + quota UX e2e with fakes.
- Each ID in §4 has ≥ 1 test and is ticked in PROGRESS.md; nothing in §4 silently skipped — if dropped, log why in Decisions.
