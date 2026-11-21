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
export const socialKinds = ['facebook', 'instagram', 'youtube', 'tiktok', 'whatsapp', 'x'] as const

const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'color.invalid')
const pct = z.number().int().min(0).max(100)
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
    nameFont: font,
    siteFont: font,
    favicon: mediaRef.optional(),
  }),
  mode: z.object({
    base: z.enum(['light', 'dark']),
    light: z.enum(['white', 'offwhite', 'cream']),
    dark: z.enum(['midnight', 'black']),
    visitorToggle: z.boolean(),
  }),
  colors: z.object({ accent: hex, button: hex, header: hex, text: hex.optional() }),
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
  mode: { base: 'light', light: 'white', dark: 'midnight', visitorToggle: false },
  colors: { accent: '#4F46E5', button: '#18181B', header: '#FFFFFF' },
  background: { pattern: 'none', patternOpacity: 10 },
  header: { opacity: 100, sticky: true },
  style: { card: 'bordered', showcase: 'grid', hover: 'lift', motion: 'subtle' },
  footer: { socials: [] },
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

const BG = {
  white: '#FFFFFF',
  offwhite: '#FAFAF7',
  cream: '#FBF8F2',
  midnight: '#0B1020',
  black: '#0A0A0A',
} as const

export const backgroundOf = (d: Design) => BG[d.mode.base === 'light' ? d.mode.light : d.mode.dark]
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
