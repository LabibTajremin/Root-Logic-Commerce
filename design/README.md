# Design — Phase 1

**Figma:** https://www.figma.com/design/1NGfJz6PU8rxZ5pHgIcrsr (student team, file "Root Logic Commerce").

## Pages
| Page | Content |
|---|---|
| Cover | Theme overview cards (each in its own mode), page index |
| Foundations | Token specimens for all 10 modes, type scale, 4-pt spacing, components: Button (variant × size), Input (default/focus/error), Badge (5 tones), HelpHint (EN/BN popover), LockBadge + unlock CTA, Card (flat/bordered/elevated/glass), ProductCard (4 styles) |
| Minimal · Organic · Attar · Ankito · Attar Aloy | Same 51 screens per theme, re-themed by the page's variable mode: Storefront Web 1440 (10) · Storefront Mobile 390 (10) · Admin Web 1440 (15 + বাংলা Dashboard) · Admin Mobile 390 (15) · Home in the alternate light/dark mode |

Storefront: Home, Category, Product, Cart drawer, Checkout, OTP, Order success, Track order, Search, 404.
Admin: Login, Dashboard, Orders, Order detail, Products, Product editor (upload hints), Categories (drag tree), Stock, Promotions, Design editor (live preview), Messages, SEO & Analytics, Users & roles, Plan (locks), Help center.

## v2 pages (Phase 10 — BUILD_SPEC_V2, awaiting owner approval)
Demo photography: 14 generated, unbranded product photos (attar, panjabi, saree, honey/ghee, tea, earbuds, speaker, sneakers, watch, skincare, cookware, baby, hero lifestyle, try-on portrait) on page **v2 · Assets**.
| Page | Content |
|---|---|
| v2 · Foundations | Token-bound components: buttons/order paths (B2, C19 বাংলা CTA), badges, urgency line, rating, 15 status chips, fraud pill, courier badge, payment chips, Pro lock · product card v2, variant picker + multi-select (A1/A16), FBT (A8), sticky buy bar, trust strip + certificate modal (B6), help bubble (B9), mini-cart (B15), announcement (B1), coupon (C2), district/thana + auto zone (C4/C17), share location (C5), social-proof toast (B7), bottom nav (B10), reel card (B4) · AI chat panel, chat-to-order confirm, try-on states incl. quota reached, popup (B8), ⌘K, bulk bar, order row + drawer (F12), AI confirm-before-apply (I5), AI usage meter (I7) |
| v2 · Storefront | Web 1440: Home (all B5 blocks), Category (A11), Product (story order), Checkout v2, Thank-you v2, Landing A (story, Organic) + B (bold offer, Minimal dark, exit-intent), Flash sale, Wishlist, CMS page · Mobile 390: Home, Product (sticky bar), Checkout, AI chat + try-on, popup + toast · Theme variants: Attar Aloy dark (Home, Product, Checkout web + mobile), Organic light (Home web + mobile, Category) |
| v2 · Layout gallery | J2 gallery (8 niche layouts, Pro lock), preview banner, J3 switch dialog |
| v2 · Admin | Shell components (Simple/Pro grouped sidebar, top bar with ⌘K, AI, New order, notifications, dark mode) · Web: Dashboard, Orders (+drawer, bulk bar), New order, Incomplete, Courier settings / dashboard / parcel scan, Coupons, Reviews, Design v2 (J1 tabs + live preview), Landing editor, Features (J5), AI Knowledge (EN + বাংলা), AI usage, Do it with AI, Tracking (H1–H3), Activity log (undo), Customers, Expenses, Profit calculator, Auto-assign · Dark: Dashboard, Orders · Mobile: Dashboard (Simple), Orders (EN + বাংলা), New order |

## Tokens → code (`site_settings.design` → CSS custom properties on `<html>`)
Collection **Theme** (modes: `<Theme> · Light|Dark`), CSS names in each variable's WEB code syntax:
- Colors `--color-{bg,surface,soft,text,muted,line,accent,accent-tint,button,button-text,header,header-text,success,danger,warning}`
- Radii `--radius-card`, `--radius-control` · Fonts `--font-heading` (+ style), `--font-body` (+ strong style)
- `content/*` string variables are sample copy only (store name, hero, categories, products) — not code tokens.
Collection **Spacing**: `--space-{1,2,3,4,5,6,8,10,12,16}` = 4…64 px.

| Theme id | Default mode | Heading / body font | Accent · Button | Radius card/control |
|---|---|---|---|---|
| minimal | light | Inter / Inter | #4F46E5 · #18181B | 12 / 10 |
| organic | light (cream) | Fraunces / Manrope | #4E7A3A · #3F6B2F | 20 / 14 |
| attar | dark (midnight) | Cormorant Garamond SemiBold / Manrope | #C9A45C · #C9A45C | 6 / 4 |
| ankito | light (cream) | DM Serif Display / DM Sans (+ Hind Siliguri) | #A8763E · #3C6430 | 18 / 10 |
| attar-aloy | light (blush) | Cormorant Garamond Light / Manrope | #B76E8A · #6B5B8C | 22 / 14 |

Full light + dark palettes: Foundations page (and `PROGRESS.md › Decisions` for ankito/attar-aloy).

## Rules the code must keep
- Images: fixed aspect-ratio boxes + `object-fit: cover`; upload hints per spec §7.3 are shown on every media field.
- `৳` renders with a Bangla-capable font fallback (Hind Siliguri / Noto Sans Bengali).
- Every admin field has a HelpHint (ⓘ); locked premium features stay visible with LockBadge + "Unlock — contact Root Logic Lab".
- Footer credit "© Root Logic Lab" unless `removeBranding`. Touch targets ≥ 44 px; admin mobile uses a bottom nav.
