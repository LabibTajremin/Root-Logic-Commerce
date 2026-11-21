# Design — Root Logic Commerce (merged v1 + v2, Phase 10)

**Figma:** https://www.figma.com/design/1NGfJz6PU8rxZ5pHgIcrsr — one design for the whole product (`docs/BUILD_SPEC.md` §9 Phase 10). Agent notes, ids and helper scripts: `design/FIGMA_AGENT_NOTES.md`, `design/figma-screen-builder.js.txt`.

## Pages (exactly 9)
| # | Page | Content |
|---|---|---|
| 1 | Cover | Title, five theme cards (own photography), page index, version |
| 2 | Foundation | Tokens (5 themes × light/dark), type, spacing, components (v1 set + order paths, chips, variant picker, FBT, trust strip, help bubble, AI chat/try-on, order row/drawer, ⌘K…), **Moodboard** (10 references, one line each), **Reels (B4)** cover-flow card + desktop/mobile carousel + overlay player, **forms/data/feedback/decor** library (inputs, toggles, slider, select, upload, stat tile, chart, filter bar, data table, empty state, toasts, confirm dialog, countdown, welcome/exit-intent popups, live-preview frame, stickers, price tag, verified seal, kantha/alpana dividers, micro-illustrations), **Assets** (product + theme hero/mood photos, textures, 6 illustrations) |
| 3 | Core design | Every screen, Minimal light, 4 sections — Web 1440 › Public (27), Web 1440 › Admin (70), Mobile 390 › Public (26), Mobile 390 › Admin (64). বাংলা variants: Dashboard, Orders, Checkout, AI Knowledge |
| 4–8 | Theme · Minimal / Organic / Attar / Ankito / Attar Aloy | Major screens (§10.3) + illustrated 404 / empty cart / offline / thank-you, re-themed by variable mode; each theme has its own hero photography, texture and composition (Attar mirrored on smoke-and-gold, dark); Home also in the alternate mode |
| 9 | Docs | How to read, token → CSS map, component ↔ code map, feature-ID → frames index, per-screen quality checklist, changelog |

## Design direction ("calm commerce, loud results")
BN-first warm copy, owner story block, asymmetric hero with handwritten price tag and sticker badge, editorial story sections, reel cover-flow, kantha/alpana dividers, paper/kraft/handloom/florals/smoke textures, custom folk-editorial illustrations (rickshaw 404, monsoon tea-stall offline, jute-bag empty cart, rider order-success, shop-shutters empty admin, spice-basket search). Accessibility (AA, 44 px targets) and the §8 performance budget win over decoration.

## Tokens → code (`site_settings.design` → CSS custom properties on `<html>`)
Collection **Theme** (modes `<Theme> · Light|Dark`): colors `--color-{bg,surface,soft,text,muted,line,accent,accent-tint,button,button-text,header,header-text,success,danger,warning}`, radii `--radius-card|control`, fonts `--font-heading|body`. Collection **Spacing**: `--space-{1…16}` = 4…64 px. Tints = token colour at 12–14 % paint opacity.

| Theme id | Default mode | Heading / body | Accent · Button | Radius card/control |
|---|---|---|---|---|
| minimal | light | Inter / Inter | #4F46E5 · #18181B | 12 / 10 |
| organic | light (cream) | Fraunces / Manrope | #4E7A3A · #3F6B2F | 20 / 14 |
| attar | dark (midnight) | Cormorant Garamond SemiBold / Manrope | #C9A45C · #C9A45C | 6 / 4 |
| ankito | light (cream) | DM Serif Display / DM Sans (+ Hind Siliguri) | #A8763E · #3C6430 | 18 / 10 |
| attar-aloy | light (blush) | Cormorant Garamond Light / Manrope | #B76E8A · #6B5B8C | 22 / 14 |

Bangla copy uses Anek Bangla (headings/UI) with Noto Sans Bengali fallback; handwritten accents use Caveat.

## Rules the code must keep
Fixed-ratio image boxes + `object-fit: cover`; upload hints on every media field; every admin field has a HelpHint; locked features stay visible with LockBadge; footer credit unless `removeBranding`; touch targets ≥ 44 px; admin mobile uses a bottom nav; reels/players/maps load on tap.
