import { z } from 'zod'
import { layoutSchema, type Layout, type SectionRef } from '@/modules/site-settings'

const none = z.object({}).strict()

/** Every section a page can hold; settings are Zod-validated with defaults. */
export const sectionSchemas = {
  'promo-banners': none,
  hero: none,
  'category-nav': none,
  'product-grid': none,
} as const

export type SectionId = keyof typeof sectionSchemas

export const isSectionId = (id: string): id is SectionId => Object.hasOwn(sectionSchemas, id)

const ref = (sectionId: SectionId): SectionRef => ({ sectionId, enabled: true, settings: {} })

/** Niche layout presets: ordered home sections. */
export const layoutPresets = {
  general: [ref('promo-banners'), ref('hero'), ref('category-nav'), ref('product-grid')],
} as const satisfies Record<string, SectionRef[]>

export const defaultLayout: Layout = { preset: 'general', home: [...layoutPresets.general] }

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
