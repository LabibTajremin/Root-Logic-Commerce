# Competitor analysis & feature gap — Root Logic Commerce

> Agent: build from `docs/BUILD_SPEC.md` (authoritative, same IDs). Read this file only for §4 (design brief) in Phase 10.

Source: the competitor's 46-min recorded class "Class 2 Part 2" (Biz Care IT demo shop `new.demo.bizcareit.com` + a client store `blackrace.com.bd`), reviewed frame-by-frame (one frame per 3 s, 240 distinct screens) plus the Bangla narration transcript (`docs/competitor/transcript.md`). Owner's brief: handwritten note, 2026-11-21.
Timestamps `mm:ss` point into that video.

Legend — **Have** = already in our code (PR #2) · **Gap** = missing · **Plan** = Free / Pro (paid plan) / AI (metered, paid) — our proposed packaging.

---

## 1. What we already have (our progress, PR #2, phases 0–9 green)

| Area | Status in our app |
|---|---|
| Engine | Next 16 modular monolith, multi-tenant (`store_id` everywhere, Host → store), Vercel + VPS profiles, 100 % coverage gate, Lighthouse ≥ 95 |
| Storefront | Home, category, product, search, cart drawer, checkout (COD, delivery zones, email/SMS OTP), order success, track order (POST), 404, SEO (metadata, JSON-LD, sitemap, robots) |
| Themes | 5 themes (minimal, organic, attar, ankito, attar-aloy) + `new-theme` skill; slots + CSS-variable tokens |
| Design editor | Live preview (mobile/desktop), fonts (EN+BN), colours with AA check, light/dark, 24 patterns, header opacity/sticky, card/showcase/hover/motion, footer, socials |
| Admin | Login (rate-limited), dashboard insights, orders list/filters/detail/one-tap status/printable invoice, products + editor (images, video, SEO), categories drag tree, stock (movements, low-stock, manual adjust), promotions (banners, posters, video, YT/FB/IG embeds), messages (email/SMS/WhatsApp templates + outbox), SEO, users & roles, plan locks, help centre, EN/বাংলা |
| Data/ops | Stock deducted on CONFIRMED (atomic), order events log, cookieless analytics + GA4 gtag/ecommerce events, media pipeline (WebP variants, quotas, Drive links, S3/R2), CSP |

**Not built from our own spec yet:** Google-Drive *uploads*, GA4 data inside admin (premium), video duration cap, blurhash.

---

## 2. What the competitor shows (feature extraction)

### 2.1 Storefront — home (00:18–03:00, 26:45–30:30)
- Scrolling **announcement marquee** (offers, hotline, "50,000+ orders delivered") — top bar.
- Header icons: Track order · Account · Wishlist · Cart · More; **Flash Sale** button in the category bar; hotline "Call us now"; language switch (EN/বাং) + **page translate** button.
- **Hero slider** with animated shapes and "From Tk X"; WebGL slide transitions (Wave/Ripple/Pixel).
- **Shoppable video reels** (3-D cover-flow of vertical videos, "Shop now" per reel).
- **Combo offers** (bundle: 3 products, combined price, "15 % less", "Order this combo").
- Featured categories (image tiles), **Editor's picks**, per-category product rows with "View all" / "Shop Kitchen Tools →".
- **Shop by brand** (logo strip), **Shop by budget** (Under ৳500 / 500–1000 / …).
- **Testimonials as WhatsApp-chat screenshots** ("What customers say").
- **Follow us on Facebook** block (live page widget).
- **Verified business badges** (Trade licence, TIN, VAT BIN, e-Commerce DBID, 7-day replacement) with "View certificates" modal.
- **Recent-purchase social-proof popup** (bottom-left, product + "x people bought").
- Footer: Android app download, payment logos, info links, contact, social.
- Product card: rating ★ + "N sold", discount badge ("Save 13 %", "Eid Special", "Limited"), wishlist ♡, **Order Now** + add-to-cart icon.
- Floating buttons: Messenger chat, translate, compare/scroll; mobile **bottom nav** (Track, Wishlist, Home, Menu, Account).

### 2.2 Storefront — category & product (03:15–08:36)
- Category page: filter sidebar (category tree, brands), per-page selector, grid-density switch, sort.
- Product page: badge, rating/review count/sold, compare-at price, **gift-card note**, product code, **"6 items left"** stock urgency, short highlight, **variants: size + colour (multi-colour pick)**, size chart, qty stepper.
- Buttons: Add to cart · **Order now** · Wishlist · **WhatsApp order** · **Call for order**; **sticky bottom bar** on mobile.
- Delivery cost card (Inside/Outside Dhaka), **customer-review screenshot gallery**, "Key benefits" (মূল সুবিধা) checklist.
- **Frequently bought together** (checkbox bundle, "Add selected to cart").
- Tabs: Details · Reviews · **How to use (steps)** · Specifications (grid) · **FAQ (accordion)**; "Why buy" checklist; photo strip; related products; share buttons.
- **AI shopping assistant** (06:45–08:15): chat on the product page; shopper uploads a selfie → **AI virtual try-on image** ("how will it look on me", 30–40 s); recommends similar products; can take the order in chat ("ami order korte chai").

### 2.3 Checkout & after (09:00–17:45)
- One-page checkout; gift-card field; **"Just talk, we order" — Bangla voice ordering** (AI asks name/phone/address and fills the form).
- **Form draft kept** ("What you typed before is still here") → feeds **incomplete-order capture**.
- Address helper asks for thana/upazila; **"Share my location"** (GPS → map link for rider).
- Editable cart lines inside checkout, delivery-area radio, COD; trust lines ("registered business", "pay when you receive").
- **Exit-intent popup** "Your order is not finished yet!" (landing pages).
- Thank-you page: order no., **Print invoice**, **WhatsApp confirm**; configurable texts/colours; upsell popup.

### 2.4 Admin — orders & operations (14:36–26:00)
- Dashboard: orders, order value, delivered sales, cost, profit, **courier cost, other expense**, products, stock; status tiles incl. **Incomplete**; **by-courier table** (sent/on the way/delivered/returned/success); sales trend; filters (product, date, courier).
- Top bar: **⌘K menu search**, **AI** button, **New order** (manual/phone order), notifications bell, dark mode, full screen.
- Order statuses: Pending, **Incomplete, On hold, Scheduled**, Confirmed, Processing, Shipped, **Courier hold**, Delivered, **Partial delivered, Returning, Return received, Return missing**, Cancelled, **Trashed**.
- Order row: invoice, source (**Voice / Chat / Direct / Landing**), customer + 1-tap WhatsApp, product, status + who changed it, **fraud score % (courier success history)**, amount, ship cost, paid/unpaid/due, courier + tracking id, **duplicate-order warning**, delivery notes ("deliver after 5 PM").
- **Bulk actions**: AI confirm, assign, status, print, delete, **send to courier (RedX, Pathao, Steadfast, CarryBee, eCourier)**, **sync courier status**.
- Order drawer: second phone, **IP + device id with "Block this IP/device"**, ISP, orders from this device, GPS link, payment info, **previous order history**.
- Live "New order" toast; **Notifications** page grouped by kind.
- **POS (shop counter)**: shift open/close with opening cash, barcode/SKU scan, product grid, discount, Cash/bKash/Nagad/Rocket/Card/Bank, change due, customer phone.
- **Parcel scan**: hand-over to courier rider by scanning box QR/barcode → printable hand-over receipt; returns scan; what came back report.
- **Follow-ups** (call reminders), **Auto-assign bot** (round-robin new + incomplete orders to staff), **Activity logs** with **undo**, Trashed orders, Chat-order settings/report.

### 2.5 Admin — site design (26:30–30:12)
- Section tabs: Header, Menu, Footer, Product card, Floating buttons, Product page, Language texts, Checkout, Thank-you page, SEO & sharing, Layout & speed, Mobile menu — **each with live preview + autosave**.
- Product page: gallery thumb position, image fit, zoom on hover, arrows, **mobile section order (drag)**, sticky buy bar, **which buttons show (sortable toggles)**.
- Checkout: address mode (free text + area vs **district/thana pickers with per-district charge**), extra fields (email, second phone), section titles.
- Layout: products per row per breakpoint, picture shape (1:1 / 4:5), per-page counts, page width, currency sign, slider effect.
- Footer presets (Premium dark w/ floating shapes, Classic), call/WhatsApp card.
- **Theme layout gallery by niche** (Default, Fashion, Gadget, Organic, Panjabi, Cosmetics, Daily needs, Kitchen, Watch, Baby, Electronics …) with picture + **live preview mode** ("only you see this — Use this theme / Exit preview").
- **Switch theme with demo data**: take my data / hide mine and use demo / keep both / start fresh.
- Homepage **section builder** (order, on/off, item counts), website font + page background presets, product badges, dynamic text, newsletter.

### 2.6 Admin — growth, AI & business (30:48–45:00)
- **Landing pages** (sales pages per product, 11 designs, Bangla persuasive blocks: video, problem→solution, why us, comparison table, gallery, certificates, **pack/quantity offers**, inline checkout, exit popup); stats visitors/orders/conversion; copy & edit; **AI "write it another way"**; inline click-to-edit live preview.
- **Profit calculator** (cost, price, ad cost/order, packing, target units, call-cancel %, return %, delivery income, return loss → net profit, margin, ROI, effective CPA; history; compare).
- **"Do it with AI" admin agent**: natural-language questions ("today's sales?", "best sellers this month") and actions ("confirm all good pending orders") with a **"Check before it is done"** confirmation; Teach the AI, AI approvals, **staff report (AI)**.
- Growth menu: Features on/off, **Popups (welcome/offer)**, Marketing kits, **Flash sales**, **Returns & exchange**, **Back-in-stock**, **Reward points**, **Pre-order**, **Affiliates**, **Blog**, **Gift cards**, Customers (CRM), **Review requests**, **Screenshot reviews**, **Campaigns (SMS/Email/WhatsApp)**, **Customer reminder (re-order after N days)**, Certificates, **Slow-moving stock**, **Daily summary**, **Backups**, AI shop chat.
- **Office management (HR)**: people, attendance (in/out, late, breaks, lost time), daily reports, performance targets, leave, requests, advances, payroll/salary; worker profile; **staff report** (orders, confirm rate, delivery success per staff).
- **Reports, Expense** tracking, **Fraud protection**, Invoice designs (multiple), Payment settings (bKash, Nagad, SSLCommerz, EPS, UddoktaPay), Courier settings, Delivery-charge manager.
- **Settings/integrations**: GTM + GA4 (+ extra properties), **Microsoft Clarity**, Search Console verification, **Meta Pixel + Conversions API** (choose when "Purchase" fires: placed/confirmed/delivered; multiple pixels), **TikTok Events API**, **courier fraud check (Hoorin)**, **auto-calling (ManyDial)**, SMS, admin login security, SMTP; Tracking setup guide; Add-ons marketplace; System update; Videos & guides; **Branded Android app**.
- Slide "50+ features" (00:00, 03:39, 45:06): Shoppable video reels, AI chat order, Bangla voice order, Welcome/offer popups, Parcel barcode scanning, Follow-up reminder, Automatic data backup, Pixel event report, Coupons/flash sales/offers, Gift cards, Reward points, SMS/Email/WhatsApp campaigns, Automated review collection, Back-in-stock & pre-orders, Affiliate & blog, Slow-moving stock report, Purchase & supplier management, Worker management, Branded Android apps, One-click demo store setup, Fast site, Mobile responsive, Marketing-friendly, Easy checkout, Incomplete-order system, Order guard, Order OTP, IP block, Min/max order limit, Clarity heatmap, Multiple landing pages, Server-side pixel & GTM + GA4, auto SMS notification, Auto call, Easy admin, Fraud check, Auto/manual order assign, Activity log, Auto courier send, Invoice print, Multiple invoice designs, Return management, Courier performance tracking.

### 2.7 What the narration adds (selling points the presenter stresses)
The transcript is noisy (see its header); these are the points that come through clearly, with timestamps:
- **Popup shows the latest product** to every visitor (01:13–01:30).
- **Trade licence / certificates on the site build trust** (02:31).
- **Try-on**: "আমাকে কেমন লাগবে?" — the bot asks for a photo and takes a while to generate (06:49–07:34). The audience reaction (10:32) says this was the stand-out feature.
- **Chat collects name, phone and address** and places the order (08:24–09:30).
- **GPS share gives the rider the full address and house** (10:00).
- **Incomplete orders recover ad spend**: paid traffic lands on the page, and shoppers who leave mid-checkout are still captured for a call (15:04, 16:07–16:39).
- **OTP on order** stops fake orders (17:52).
- **Use On hold / Scheduled instead of cancelling** orders you couldn't reach yet (19:15–19:45).
- **One click to Pathao/Steadfast**; courier hold, returns and partial delivery are tracked (20:15–21:46).
- **Fake orders**: block device/IP; the courier success ratio shows risky phones (23:23–23:53).
- **Run everything from the phone** (24:55).
- **Design without a developer**, including the checkout layout; full-site theme preview (26:23–29:45).
- **A landing page sells one product end-to-end** and is edited by drag-and-drop (30:48–31:22).
- **Profit calculator walkthrough**: cost ৳231, price ৳990, cancel/return % and courier terms decide real profit (32:39–35:39).
- **AI writes the daily report and answers questions** (36:47).
- **Staff and courier performance**: who sells best, which courier delivers best (37:26–37:38).
- **Auto-assign incomplete orders to staff**; the activity log shows who deleted what (38:40–39:46).
- **Office management** for staff productivity and salary (40:16–42:06).
- **Pixel training** (43:53–44:38): if Purchase fires on fake orders, Facebook learns the wrong audience. Fire it on confirmation so ads target real buyers → H1.

### 2.8 Details found on second pass (frames with small changes)
- Client store `blackrace.com.bd`: Add to cart · Buy now · Order on WhatsApp · Call for order; "See size chart"; floating cart pill with count + total (→ B15).
- Multi-variant pick: choosing White·M and more adds a "Selected" list with qty each and total (→ A16).
- Checkout: auto-detected zone chip under the address ("ঢাকা — ঢাকার ভিতর") (→ C17); remove-line confirm; big Bangla CTA "এখনই অর্ডার করুন" + "Processing…" + trust lines (→ C18, C19).
- AI chat: quick-reply chips ("ডেলিভারি চার্জ কত?"), product cards with "অর্ডার করুন" / "আমাকে কেমন লাগবে?", cross-sell, "✓ added to cart", then asks name and phone (→ I1, I2).
- Orders: notes like "Gift wrap please" and "Office address — deliver on weekday", bKash payment ref, raw courier status (in_review, partial_delivered), staff name under status (→ C6, F12).
- Activity log: "Returning for 9 days and not scanned back → auto Return Missing after 5 days" — an automatic status rule (→ C21); filter chips by action with counts; system actor; 30-day retention.
- Order drawer: editable order date, ISP, "7 orders from this device · 1 number", GPS "within about 36 m".
- "Do it with AI": microphone input, answers as tables (→ F11, I5).
- Settings → Meta: "who sends events" (this website / GTM + server / GTM only), domain verification, test event code, more pixels, CAPI-token warning; GTM tab: downloadable GTM setup file, extra GA4 properties (→ H1, H3).
- Front Page → Manage Page Data: About, Return policy, Privacy, Terms, Contact (→ J8; we have none).
- Landing pages: URL prefix setting (`/offer/`), filter by design, hidden flag.
- Home: product promo popup over the slider (Buy | Not now) (→ B8).
- Profit calculator: note, save, "Saved at", expense breakdown, verdict badge (→ G2).
- Office: roles (Social media manager, Order executive, Delivery coordinator, Customer care, Packing & dispatch), salary, "Not in yet" (→ F9).
- **Our own v1 gap:** BreadcrumbList JSON-LD (v1 §5.11) is not implemented.

---

## 3. Full gap list (everything the competitor has that we don't) + owner's new asks

IDs are used by `docs/BUILD_SPEC.md` (it also adds A16, B15, C17–C21, F11, F12, J8 from §2.8 — see the spec for the full acceptance list). Priority: **P0** = sales-critical in BD f-commerce, build first · **P1** = strong differentiator · **P2** = later.

### A. Catalog & product page
| ID | Feature | Pri | Plan |
|---|---|---|---|
| A1 | Product variants (size, colour, …) with per-variant price/stock/SKU/image; multi-colour pick | P0 | Free |
| A2 | Brands (entity, filter, "Shop by brand") | P1 | Free |
| A3 | Product badges (custom: Eid special, Limited, New) + auto % off badge | P0 | Free |
| A4 | Stock urgency ("N left"), "N sold" counter | P0 | Free |
| A5 | Size chart per product/category | P1 | Free |
| A6 | Product tabs: Specifications grid, How-to-use steps, FAQ accordion, Key benefits checklist | P0 | Free |
| A7 | Reviews & ratings (text + photo, moderation) and **screenshot reviews** gallery | P0 | Free |
| A8 | Related products + **Frequently bought together** (checkbox add) | P0 | Free |
| A9 | **Combo / bundle offers** | P1 | Pro |
| A10 | Wishlist (guest, device-local; synced if account later) | P1 | Free |
| A11 | Category filters (price, brand, variant), sort, per-page, grid density | P0 | Free |
| A12 | Share buttons, quantity stepper, image zoom + gallery arrows | P0 | Free |
| A13 | Pre-order products | P2 | Pro |
| A14 | Back-in-stock alerts (SMS/WhatsApp) | P2 | Pro |
| A15 | Bulk product import/export (CSV) | P1 | Free |

### B. Storefront conversion
| ID | Feature | Pri | Plan |
|---|---|---|---|
| B1 | Announcement marquee bar | P0 | Free |
| B2 | Order Now (buy-now) + **WhatsApp order** + **Call to order** buttons; configurable/sortable; mobile sticky buy bar | P0 | Free |
| B3 | Hero slider (multi-slide, timed; CSS transitions only) | P0 | Free |
| B4 | **Shoppable video reels carousel** (vertical 9:16, swipe/cover-flow): sources = uploaded mp4/webm **and Facebook Reels / Instagram Reels links** (also TikTok, YouTube Shorts); each reel links to products ("Shop now"); tap-to-load player; on home, product page and landing pages | P1 | Pro |
| B5 | Home **section builder** (order, on/off, counts): categories, editor's picks, per-category rows, brands, budget bands, reels, combos, testimonials, trust badges, FB follow, newsletter | P0 | Free (some blocks Pro) |
| B6 | **Trust badges + certificate viewer** (trade licence, TIN, BIN, DBID) | P0 | Free |
| B7 | **Social-proof popup** (recent purchases, real data only) | P1 | Pro |
| B8 | **Welcome / offer / exit-intent popups** | P1 | Pro |
| B9 | Floating buttons (Messenger, WhatsApp, call, back-to-top) | P0 | Free |
| B10 | Mobile bottom nav (Track, Wishlist, Home, Menu, Account) | P0 | Free |
| B11 | Flash sale (countdown, sale price window, Flash-sale page) | P1 | Pro |
| B12 | Shop by budget bands | P2 | Free |
| B13 | Newsletter / phone capture | P2 | Free |
| B14 | Blog | P2 | Pro |

### C. Checkout & orders
| ID | Feature | Pri | Plan |
|---|---|---|---|
| C1 | **Incomplete-order capture** (draft saved as you type; admin "Incomplete" tab; follow-up) | P0 | Free |
| C2 | Coupons / discount codes (%, fixed, free shipping, min order, expiry, usage caps) | P0 | Free |
| C3 | Free-shipping rules (threshold, product, area) | P1 | Free |
| C4 | District → thana pickers with per-district delivery charge (BD geo data) | P1 | Free |
| C5 | **Share my location** (GPS link for rider) | P1 | Free |
| C6 | Second phone, optional email, delivery note/time | P0 | Free |
| C7 | Min/max order quantity & value limits | P1 | Free |
| C8 | Gift cards (issue, redeem at checkout, balance) | P2 | Pro |
| C9 | Reward points | P2 | Pro |
| C10 | Thank-you page builder (texts, WhatsApp confirm, print invoice, upsell) | P1 | Free |
| C11 | Online payments: bKash, Nagad, SSLCommerz (payments port exists) + partial advance (delivery charge first) | P1 | Pro |
| C12 | Manual / phone order entry from admin ("New order") | P0 | Free |
| C13 | Extra statuses: On hold, Scheduled, Courier hold, Partial delivered, Returning, Return received, Return missing; Trash | P0 | Free |
| C14 | Returns & exchange workflow | P1 | Free |
| C15 | Order source tracking (web, landing, chat, voice, POS, manual) | P0 | Free |
| C16 | Multiple invoice designs + bulk print + packing slip with barcode | P1 | Free |

### D. Fraud & risk (order guard)
| ID | Feature | Pri | Plan |
|---|---|---|---|
| D1 | **Duplicate-order detection** (same phone/product window) | P0 | Free |
| D2 | **Courier success-rate check** per phone (fraud score) | P0 | Pro |
| D3 | **Block IP / device / phone** | P0 | Free |
| D4 | Order rate limit per phone/IP ("order guard") | P0 | Free |
| D5 | Fake-order report & blocked list | P1 | Free |

### E. Courier & fulfilment
| ID | Feature | Pri | Plan |
|---|---|---|---|
| E1 | **Courier integrations**: Steadfast, Pathao, RedX (+ CarryBee, eCourier later) — create parcel, tracking id, label | P0 | Pro |
| E2 | Bulk send to courier + **status sync** (webhook/poll) → auto order status | P0 | Pro |
| E3 | Courier performance dashboard (sent / on way / delivered / returned / success %) | P1 | Pro |
| E4 | **Parcel scan hand-over & returns** (barcode/QR, camera on phone) + printable hand-over receipt | P1 | Pro |
| E5 | Courier cost & COD reconciliation | P1 | Pro |

### F. Admin productivity & team
| ID | Feature | Pri | Plan |
|---|---|---|---|
| F1 | ⌘K command/menu search | P1 | Free |
| F2 | Real-time new-order toast + notification centre | P0 | Free |
| F3 | **Activity log with undo** (who changed what) | P0 | Free |
| F4 | Bulk order actions (status, assign, print, courier) | P0 | Free |
| F5 | Follow-ups / call reminders | P1 | Free |
| F6 | **Auto-assign bot** (round-robin orders/incomplete to staff) + staff report (orders, confirm rate, delivery success) | P1 | Pro |
| F7 | Customer CRM (history, lifetime value, tags, notes, block) | P1 | Free |
| F8 | Admin dark mode | P2 | Free |
| F9 | Office/HR (attendance, leave, payroll, daily reports) | P2 | Pro add-on |
| F10 | Auto-calling (IVR confirm) integration | P2 | Pro |

### G. Money & reports
| ID | Feature | Pri | Plan |
|---|---|---|---|
| G1 | Expenses (categories, ad spend) → net profit on dashboard | P1 | Free |
| G2 | **Profit calculator** (unit economics incl. cancel/return rates, CPA) | P1 | Free |
| G3 | Reports: sales, product, customer, slow-moving stock, daily summary (WhatsApp/email) | P1 | Pro |
| G4 | Purchases & suppliers (purchase orders → stock in, supplier dues) | P2 | Pro |
| G5 | **POS (counter sale)** with barcode, shift cash, bKash/Nagad/card | P2 | Pro |
| G6 | Automatic backups (download, restore point) | P1 | Free (VPS nightly exists) → UI |

### H. Marketing & tracking
| ID | Feature | Pri | Plan |
|---|---|---|---|
| H1 | **Meta Pixel + Conversions API** (server-side, dedup event id, choose Purchase trigger: placed/confirmed/delivered) | P0 | Free |
| H2 | **TikTok Pixel + Events API** | P1 | Free |
| H3 | **GTM container + Microsoft Clarity + Search Console verification** fields | P0 | Free |
| H4 | Pixel event report (what fired, failures) | P2 | Pro |
| H5 | **Landing pages builder** (product sales page, Bangla persuasive blocks, pack offers, inline checkout, exit popup, stats) | P0 | Pro |
| H6 | Campaigns: SMS/Email/WhatsApp broadcast to segments | P1 | Pro |
| H7 | **Re-order reminders** (consumables, after N days) | P1 | Pro |
| H8 | Automated review requests after delivery | P1 | Pro |
| H9 | Affiliate program | P2 | Pro |
| H10 | Facebook/Google product feed (catalog XML/CSV) | P1 | Free |

### I. AI (owner's paid services — §AI in build spec)
| ID | Feature | Pri | Plan |
|---|---|---|---|
| I1 | **Shop chatbot** (Bangla/English) answering from catalog + **owner-uploaded knowledge** (policies, FAQ, PDFs, text) with an admin "AI Knowledge" upload page | P0 | AI (free quota) |
| I2 | Chat-to-order (chatbot collects name/phone/address → normal order, source=chat) | P1 | AI |
| I3 | **Image chatbot: AI virtual try-on / product-in-your-space** from a shopper photo, with **hard free-tier limits that are never exceeded** (per-store monthly cap + global budget), paid upgrade later | P1 | AI (capped) |
| I4 | **Bangla voice order** (speech → fills checkout) | P2 | AI |
| I5 | **Admin "Do it with AI"** (questions + actions with confirm-before-apply) | P1 | AI |
| I6 | AI copy helpers (product description, landing copy "write another way", BN↔EN) | P1 | AI |
| I7 | AI usage meter & limits page (per feature, per month, upgrade CTA) | P0 | — |

### J. Design system & platform
| ID | Feature | Pri | Plan |
|---|---|---|---|
| J1 | **Section-level design editor** (header, menu, footer presets, product card, product page layout, checkout, thank-you, floating buttons, mobile menu) with live preview + autosave | P0 | Free |
| J2 | **Niche layout gallery** with full-page live preview mode ("only you see this") | P0 | Free (extra niches Pro) |
| J3 | **One-click demo data per niche** (switch dialog: keep / hide / both / fresh) | P1 | Free |
| J4 | Translatable storefront texts (language texts editor) | P1 | Free |
| J5 | Feature toggles page (turn modules on/off per store) | P0 | — |
| J6 | PWA (install to home screen) now; branded Android app (TWA) later | P2 | Pro |
| J7 | Video guides inside Help centre | P2 | Free |

---

## 4. Design analysis & direction (be better, not a copy)

**Competitor strengths to beat:** dense, conversion-first pages (urgency, social proof, trust, multiple order paths), every option previewable live, Bangla-first persuasive copy, niche templates with demo data.

**Competitor weaknesses we exploit:**
- Visual noise: marquee + popups + floating buttons + chat all at once; generic blue/orange "template" look; inconsistent type (mixed serif/sans per section); heavy WebGL slider and many widgets → slower on 4G.
- Admin is a long sidebar of 60+ items — powerful but hard for non-technical owners.
- Popups and fake-feeling social proof can reduce trust.

**Our direction ("calm commerce, loud results"):**
1. **Keep our token-driven, per-store personalised themes** (owner's requirement) — every store still gets its own palette/fonts/pattern; the new sections are built once, styled only by tokens.
2. **Conversion blocks, designed quietly**: one urgency line (stock/sold) instead of many badges; trust badges as a slim verified strip; social proof only from real orders, rate-limited, dismissible; a single floating "Help" bubble that expands to WhatsApp / Messenger / Call / AI chat (instead of 4 separate bubbles).
3. **Product page = story**: gallery → price + variants → order buttons → delivery cost → benefits → reviews (photo/screenshot) → bundle → tabs. Mobile sticky buy bar showing price + variant.
4. **Bangla typography done right**: paired Bangla/Latin fonts per theme, Bangla numerals option, bigger line-height for Bangla blocks.
5. **Admin "Simple / Pro" mode**: Simple shows the 8 daily jobs (Orders, Products, Stock, Messages, Design, Reports, Help, Settings); Pro reveals growth/ops modules. Grouped navigation, ⌘K search, AI bar.
6. **Motion budget**: CSS-only transitions, `prefers-reduced-motion`, no WebGL; reels and maps load on tap; keep Lighthouse ≥ 95 with all blocks on.
7. **Real imagery in Figma**: replace placeholder circles with niche photography/illustration, show each new section in ≥ 2 themes, light + dark.

---

## 5. Owner notes captured (handwritten brief)
- Paid AI chatbot + image chatbot: admin must be able to **upload the information the chatbot learns from** → I1 + admin "AI Knowledge" page.
- Image-generation chatbot: **limit so the free tier is never exceeded**; paid version later when customers are satisfied → I3 + I7 (hard caps, fail-closed).
- Personalised theme per customer **stays** → §4.1.
- New build instruction: **redesign Figma first, then integrate all features** → `docs/BUILD_SPEC.md`.
