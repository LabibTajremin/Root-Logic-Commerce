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
