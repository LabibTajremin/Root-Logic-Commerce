import { z } from 'zod'
import { passesAA, readableOn } from './contrast'

export const fontIds = [
  'inter',
  'manrope',
  'poppins',
  'outfit',
  'dm-sans',
  'playfair-display',
  'cormorant-garamond',
  'dm-serif-display',
  'fraunces',
  'hind-siliguri',
  'noto-sans-bengali',
  'anek-bangla',
  'tiro-bangla',
] as const
export const patternIds = Array.from({ length: 24 }, (_, i) => `p${String(i + 1).padStart(2, '0')}`)
export const footerStyles = ['classic', 'centered', 'minimal'] as const
export const socialKinds = ['facebook', 'instagram', 'youtube', 'tiktok', 'whatsapp', 'x'] as const

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'color.invalid')
const pct = z.number().int().min(0).max(100)
const LEGACY_BG: Record<string, number> = {
  cream: 0,
  offwhite: 50,
  white: 100,
  midnight: 0,
  black: 100,
}
const font = z.enum(fontIds)
const mediaRef = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('upload'), id: z.uuid() }),
  z.object({ kind: z.literal('gdrive'), id: z.string().regex(/^[\w-]{10,}$/) }),
])

export const designSchema = z.object({
  themeId: z.string().regex(/^[a-z0-9-]+$/),
  brand: z.object({
    // Shown exactly as typed (any script); `showName: false` leaves just the logo mark.
    name: z.string().trim().min(1).max(60),
    showName: z.boolean().default(true),
    logo: mediaRef.optional(),
    darkLogo: mediaRef.optional(),
    footerLogo: mediaRef.optional(),
    nameFont: font,
    siteFont: font,
    favicon: mediaRef.optional(),
  }),
  mode: z.object({
    base: z.enum(['light', 'dark']),
    // Sliders 0–100. Older saves stored names; they map onto the same scale.
    light: z.preprocess((v) => LEGACY_BG[v as string] ?? v, pct),
    warmth: pct.default(50),
    dark: z.preprocess((v) => LEGACY_BG[v as string] ?? v, pct),
    visitorToggle: z.boolean(),
  }),
  colors: z.object({
    accent: hexColor,
    button: hexColor,
    header: hexColor,
    text: hexColor.optional(),
  }),
  background: z.object({
    pattern: z.enum(['none', ...patternIds]),
    patternOpacity: pct,
  }),
  header: z.object({ opacity: pct, sticky: z.boolean() }),
  style: z.object({
    card: z.enum(['flat', 'bordered', 'elevated', 'glass']),
    showcase: z.enum(['grid', 'carousel', 'list', 'hero']),
    hover: z.enum(['none', 'lift', 'zoom', 'glow']),
    motion: z.enum(['none', 'subtle', 'smooth', 'playful']),
  }),
  footer: z.object({
    // Layout preset + which blocks show; colours follow the theme tokens.
    style: z.enum(footerStyles).default('classic'),
    show: z
      .object({
        categories: z.boolean().default(true),
        help: z.boolean().default(true),
        payments: z.boolean().default(true),
      })
      .prefault({}),
    text: z.string().max(300).optional(),
    socials: z
      .array(z.object({ kind: z.enum(socialKinds), url: z.url().startsWith('https://') }))
      .max(8),
  }),
})
export type Design = z.infer<typeof designSchema>
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends (infer U)[] ? U[] : T[K] extends object ? DeepPartial<T[K]> : T[K]
}

export const baseDesign: Design = {
  themeId: 'minimal',
  brand: { name: 'My Store', showName: true, nameFont: 'inter', siteFont: 'inter' },
  mode: { base: 'light', light: 100, warmth: 50, dark: 0, visitorToggle: false },
  colors: { accent: '#4F46E5', button: '#18181B', header: '#FFFFFF' },
  background: { pattern: 'none', patternOpacity: 10 },
  header: { opacity: 100, sticky: true },
  style: { card: 'bordered', showcase: 'grid', hover: 'lift', motion: 'subtle' },
  footer: {
    style: 'classic',
    show: { categories: true, help: true, payments: true },
    socials: [],
  },
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Later layers win: base < theme defaults < saved overrides. Arrays replace, objects merge. */
export const mergeDesign = (...layers: unknown[]): unknown =>
  layers.reduce<unknown>((acc, l) => {
    if (!isObj(acc) || !isObj(l)) return l === undefined ? acc : l
    const out: Record<string, unknown> = { ...acc }
    for (const [k, v] of Object.entries(l)) out[k] = mergeDesign(acc[k], v)
    return out
  }, undefined)

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const hex = (c: number[]) =>
  '#' + c.map((x) => Math.round(x).toString(16).padStart(2, '0').toUpperCase()).join('')
/** `t` of the way from colour a to colour b (0–1). */
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)]
  return hex(x.map((v, i) => v + (y[i]! - v) * t))
}

/**
 * Light: cream → white, then nudged warm or cool (50 = neutral, up to a 40% tint).
 * Dark: midnight → black.
 */
export const backgroundOf = (d: Design) => {
  if (d.mode.base === 'dark') return mix('#0B1020', '#0A0A0A', d.mode.dark / 100)
  const base = mix('#FBF8F2', '#FFFFFF', d.mode.light / 100)
  const lean = (d.mode.warmth - 50) / 50
  return mix(base, lean < 0 ? '#FBE3C8' : '#DCE8F8', Math.abs(lean) * 0.4)
}
const textOf = (d: Design) => d.colors.text ?? readableOn(backgroundOf(d))

/** Every value here passed the schema (hex / enum / int), so it is safe inside a <style> tag. */
export const toCssVars = (d: Design) => {
  const bg = backgroundOf(d)
  const vars: Record<string, string> = {
    '--color-bg': bg,
    '--color-text': textOf(d),
    '--color-accent': d.colors.accent,
    '--color-button': d.colors.button,
    '--color-button-text': readableOn(d.colors.button),
    '--color-header': d.colors.header,
    '--color-header-text': readableOn(d.colors.header),
    // Bangla glyphs fall back to Hind Siliguri whatever Latin font is chosen.
    '--font-heading': `var(--font-${d.brand.nameFont}),var(--font-hind-siliguri),serif`,
    '--font-body': `var(--font-${d.brand.siteFont}),var(--font-hind-siliguri),sans-serif`,
    '--pattern-opacity': String(d.background.patternOpacity / 100),
    '--header-opacity': String(d.header.opacity / 100),
  }
  return `:root{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';')}}`
}

/** Pairs the Design editor warns about (below WCAG AA). */
export const contrastWarnings = (d: Design) => {
  const bg = backgroundOf(d)
  const checks: [string, string, string, boolean][] = [
    ['text', textOf(d), bg, false],
    ['accent', d.colors.accent, bg, true],
  ]
  return checks.filter(([, fg, b, large]) => !passesAA(fg, b, large)).map(([name]) => name)
}

export const brandImageSlots = ['logo', 'darkLogo', 'footerLogo', 'favicon'] as const
export type BrandImageSlot = (typeof brandImageSlots)[number]

const mediaUrl = (r: { id: string } | undefined) => (r ? `/api/media/${r.id}` : null)

/**
 * Which brand images the shop shows: the dark-mode logo on dark shops (else the logo),
 * the footer logo (else the logo), and a favicon that falls back to the app icon.
 */
export const brandImages = (d: Design) => ({
  logo: mediaUrl(d.mode.base === 'dark' ? (d.brand.darkLogo ?? d.brand.logo) : d.brand.logo),
  footerLogo: mediaUrl(d.brand.footerLogo ?? d.brand.logo),
  favicon: d.brand.favicon ? `/api/media/${d.brand.favicon.id}/320` : '/icon.svg',
})
