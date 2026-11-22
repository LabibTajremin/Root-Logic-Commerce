import type { storefront } from './storefront'

type Ctx = Awaited<ReturnType<typeof storefront>>

/** Posters that become the hero slider (B3) — none unless the owner turned it on. */
export const sliderPosters = async ({ on, design, promotions, store }: Ctx) => {
  if (!on('heroSlider') || !design.heroSlider.enabled) return []
  return (await promotions.active(store.id)).flatMap((b) =>
    b.data.kind === 'poster' ? [{ id: b.id, data: b.data }] : [],
  )
}
