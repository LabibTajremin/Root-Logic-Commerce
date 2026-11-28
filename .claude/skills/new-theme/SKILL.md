---
name: new-theme
description: Create a new storefront theme in src/themes from a description of a business niche or look (EN or বাংলা).
---

# New storefront theme

Turn a short description ("rice shop, warm earthy, rustic serif" / "সুগন্ধির দোকান, নরম প্যাস্টেল") into a
working, registered theme. Code wins over any older doc: read `src/themes/_contract.ts` first.

## 1. Extract from the description (ask ONE question only if niche or mood is missing)
- `id` (kebab-case, `^[a-z0-9-]+$`), display `name`, one-line `niche`.
- Default mode: `mode.base` `'light' | 'dark'`; light bg `'white' | 'offwhite' | 'cream'`, dark bg `'midnight' | 'black'`.
- Brand colours (hex, `#RRGGBB`): `colors.accent`, `colors.button`, `colors.header` (text colour is auto-contrast — leave `text` out).
- Fonts — only these ids (`fontIds` in `src/modules/site-settings/domain/design.ts`):
  `inter manrope poppins outfit dm-sans playfair-display cormorant-garamond dm-serif-display fraunces hind-siliguri noto-sans-bengali anek-bangla tiro-bangla`.
  `brand.nameFont` = headings, `brand.siteFont` = body. Bangla glyphs always fall back to Hind Siliguri.
- Style: `style.card` `flat|bordered|elevated|glass`, `style.showcase` `grid|carousel|list|hero`,
  `style.hover` `none|lift|zoom|glow`, `style.motion` `none|subtle|smooth|playful`.
- Optional `background.pattern` (`none` or `p01`…`p24`) + `patternOpacity` 0–100.
- Theme palette (owned by the theme, both modes): `surface soft muted line accentTint`, plus `radius { card, control }` in px.

## 2. Build it
1. Copy the skeleton: `cp -r src/themes/organic src/themes/<id>` (index.ts + slots.tsx; organic overrides 2 slots).
2. `index.ts`: export `const theme: Theme` with `id`, `name`, `niche`, `preview: '/themes/<id>.svg'`,
   `defaults` (DeepPartial<Design>: brand/mode/colors/style only), `palette.light`, `palette.dark`, `radius`, `slots`.
3. `slots.tsx`: override ONLY the slots whose layout must differ; every missing slot falls back to minimal.
   Slots and props (`Slots` in `_contract.ts`):
   - `Header({ store, categories, actions })` — keep the home link (store name), a `<nav aria-label="Categories">`, render `actions`.
   - `Hero({ store, title, sub, cta })` — exactly one `<h1>` with `title`.
   - `ProductCard({ product, action, labels })` — title `<Link href={`/p/${slug}`}>`; a duplicate media link must be
     `aria-hidden tabIndex={-1}`; image box with a fixed ratio (`aspect-square`, `aspect-[4/5]` …) + class `rlc-media relative`;
     `product.image ? <ProductImage image={product.image} sizes="(min-width: 768px) 25vw, 50vw" /> : initial(product.name)`;
     sale badge when `product.compareAt`; `product.inStock ? action : labels.soldOut`. Root element class `rlc-card`.
   - `ProductGallery({ name, images })`, `CategoryNav({ categories, active, allLabel })`, `Footer({ store, categories, text, credit, labels })`,
     `EmptyState({ title, body, action, level })` — `level` 1|2 picks h1/h2.
4. `pnpm themes:gen` (regenerates `src/themes/registry.gen.ts`; never edit it by hand).
5. Add the id to the theme loop in `tests/e2e/settings.spec.ts` (`for (const theme of [...])`) so every theme is rendered,
   with a photo, sale and sold-out product, through axe.

## 3. Rules
- Tokens only: Tailwind classes backed by CSS variables (`bg-bg bg-surface bg-soft text-text text-muted border-line
  bg-accent text-accent-ink bg-button text-button-text bg-header text-header-text rounded-card rounded-control
  font-heading font-body`). No hard-coded colours or font families in slots.
- Accent as text only via `text-accent-ink`; pills on tints need AA contrast — check muted on bg/surface/soft ≥ 4.5:1
  (`contrastRatio` in `src/modules/site-settings/domain/contrast.ts`).
- Server components only in slots (no `'use client'`), no new dependencies, `next/link` for links,
  `ProductImage` from `@/ui/product-image` for images (fixed-ratio parent, `object-cover`).
- Motion/hover come from `data-*` hooks in `src/app/globals.css` (`.rlc-card`, `.rlc-media`, `.rlc-header`);
  `prefers-reduced-motion` is already handled there — don't add your own animations.
- Touch targets ≥ 44px (`min-h-11`), visible text in accessible names, one `<h1>` per page.

## 4. Worked example (organic)
```ts
export const theme: Theme = {
  id: 'organic', name: 'Organic', niche: 'Grocery, honey, rice, tea — natural and fresh',
  preview: '/themes/organic.svg',
  defaults: {
    brand: { nameFont: 'fraunces', siteFont: 'manrope' },
    mode: { base: 'light', light: 0 }, // sliders 0–100: light cream→white, warmth warm↔cool (50 neutral), dark midnight→black
    colors: { accent: '#4E7A3A', button: '#3F6B2F', header: '#FBF8F2' },
    style: { card: 'flat', showcase: 'grid', hover: 'zoom', motion: 'smooth' },
  },
  palette: {
    light: { surface: '#FFFFFF', soft: '#F1EDE3', muted: '#56614F', line: '#E3DCCB', accentTint: '#E8F0E1' },
    dark: { surface: '#151B2E', soft: '#1C2338', muted: '#A3ADBF', line: '#2A3247', accentTint: '#1F2B1A' },
  },
  radius: { card: 20, control: 14 },
  slots: { Hero, ProductCard },
}
```

## 5. Verify, then done
- `pnpm vitest run src/themes` (registry + contract: every theme loads with the full slot set).
- `bash scripts/e2e-serve.sh && pnpm e2e tests/e2e/settings.spec.ts --project settings --no-deps -g "every theme"` (mobile+desktop
  render, axe = 0, no console errors).
- `pnpm verify` green (100% coverage: every branch in your slots must render in that theme test).
- Checklist: registry lists the id · theme selectable in Admin → Design (the select reads `themeIds`) · screenshots of
  home + product page on mobile (390×844) look right · `PROGRESS.md` notes the theme · commit `feat(themes): <id>`.
