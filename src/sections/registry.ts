import { z } from 'zod'
import { layoutSchema, type Layout, type SectionRef } from '@/modules/site-settings'

const none = z.object({}).strict()

/** Every section a page can hold; settings are Zod-validated with defaults. */
export const sectionSchemas = {
  'promo-banners': none,
  hero: none,
  'category-nav': none,
  'product-grid': none,
  // B5: one row per top category, `count` products each, with "Shop X →".
  'category-rows': z.object({ count: z.number().int().min(2).max(8).default(4) }).strict(),
  brands: none,
  'budget-bands': none,
  'trust-strip': none,
  'screenshot-reviews': none,
} as const

export type SectionId = keyof typeof sectionSchemas

export const isSectionId = (id: string): id is SectionId => Object.hasOwn(sectionSchemas, id)

const ref = (sectionId: SectionId): SectionRef => ({ sectionId, enabled: true, settings: {} })

const off = (sectionId: SectionId): SectionRef => ({ ...ref(sectionId), enabled: false })

/** Niche layout presets: ordered home sections. More niches arrive with their sections. */
export const layoutPresets = {
  general: [ref('promo-banners'), ref('hero'), ref('category-nav'), ref('product-grid')],
  fashion: [ref('hero'), ref('category-nav'), ref('product-grid'), ref('promo-banners')],
  gadget: [ref('promo-banners'), ref('product-grid'), ref('category-nav'), off('hero')],
  grocery: [ref('category-nav'), ref('promo-banners'), ref('product-grid'), off('hero')],
} as const satisfies Record<string, SectionRef[]>

export type PresetId = keyof typeof layoutPresets
export const presetIds = Object.keys(layoutPresets) as PresetId[]
export const isPresetId = (id: string): id is PresetId => Object.hasOwn(layoutPresets, id)
export const presetLayout = (preset: PresetId): Layout => ({
  preset,
  home: [...layoutPresets[preset]],
})

/**
 * B5 builder view: the stored order, then every section the layout doesn't hold yet
 * (new ones arrive switched off, so a deploy never changes a live home page).
 */
export const withAllSections = (layout: Layout): SectionRef[] => [
  ...layout.home.filter((r) => isSectionId(r.sectionId)),
  ...(Object.keys(sectionSchemas) as SectionId[])
    .filter((id) => !layout.home.some((r) => r.sectionId === id))
    .map(off),
]

/** A previewed preset that still exists (presets can be retired between deploys). */
export const previewPreset = (id: string | null) => (id !== null && isPresetId(id) ? id : null)

export const defaultLayout = presetLayout('general')

export type ResolvedSection = { id: SectionId; settings: Record<string, unknown> }

/** What a page actually renders: enabled, known sections whose settings still validate. */
export const resolveSections = (refs: SectionRef[]): ResolvedSection[] =>
  refs.flatMap((r) => {
    if (!r.enabled || !isSectionId(r.sectionId)) return []
    const parsed = sectionSchemas[r.sectionId].safeParse(r.settings)
    return parsed.success ? [{ id: r.sectionId, settings: parsed.data }] : []
  })

/** The stored layout, or the default when none is saved yet or it no longer validates. */
export const layoutOf = (stored: unknown): Layout => {
  const parsed = layoutSchema.safeParse(stored)
  return parsed.success ? parsed.data : defaultLayout
}
