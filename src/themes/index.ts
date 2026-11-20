import type { Slots, Theme } from './_contract'
import { theme as minimal } from './minimal'
import { themeIds, themeLoaders } from './registry.gen'

export type ResolvedTheme = Omit<Theme, 'slots'> & { slots: Slots }

/** Unknown ids (e.g. a removed theme) fall back to minimal; missing slots too. */
export const loadTheme = async (id: string): Promise<ResolvedTheme> => {
  const t = await (themeLoaders[id] ?? themeLoaders.minimal!)()
  return { ...t, slots: { ...(minimal.slots as Slots), ...t.slots } }
}

export { themeIds }
export {
  paletteCss,
  type CategoryView,
  type Palette,
  type ProductView,
  type StoreView,
  type Theme,
} from './_contract'
