import { cache } from 'react'
import { translate } from '@/i18n'
import type { Product } from '@/modules/catalog'
import { formatMoney } from '@/modules/shared'
import { runtime } from '@/server/runtime'
import { currentLocale, currentSettings, currentStore } from '@/server/request'
import type { MediaRow } from '@/modules/media'
import { loadTheme, type ImageView, type ProductView } from '@/themes'

/** Everything a storefront page needs for the store resolved from the Host header. */
export const storefront = cache(async () => {
  const [store, locale, { design, business, layout }, { container }] = await Promise.all([
    currentStore(),
    currentLocale(),
    currentSettings(),
    runtime(),
  ])
  const [theme, categories, unbranded] = await Promise.all([
    loadTheme(design.themeId),
    container.catalog.listCategories(store.id),
    container.plans.has(store.id, 'removeBranding'),
  ])
  const t = (k: string, v?: Record<string, string | number>) => translate(locale, k, v)
  const money = (minor: number) => formatMoney(minor, { banglaDigits: business.banglaDigits })
  const image = (m: MediaRow): ImageView => ({ src: `/api/media/${m.id}`, color: m.dominantColor })
  /** Every product's images in order, for the given products. */
  const imagesOf = async (products: Product[]) => {
    const rows = await container.media.forProducts(
      store.id,
      products.map((p) => p.id),
    )
    const by = new Map<string, ImageView[]>(products.map((p) => [p.id, []]))
    for (const r of rows) by.get(r.productId)!.push(image(r.media))
    return by
  }
  const view = (p: Product, images: ImageView[]): ProductView => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: money(p.price),
    compareAt: p.compareAtPrice === null ? null : money(p.compareAtPrice),
    inStock: p.stock > 0,
    image: images[0] ?? null,
  })
  const live = categories.filter((c) => !c.archived)
  return {
    store: { ...store, name: design.brand.name },
    locale,
    design,
    business,
    layout,
    theme,
    t,
    money,
    view,
    imagesOf,
    credit: !unbranded,
    categories: live.filter((c) => !c.parentId).map((c) => ({ name: c.name, slug: c.slug })),
    allCategories: live,
    catalog: container.catalog,
    orders: container.orders,
    otp: container.otp,
    promotions: container.promotions,
    limits: container.limits,
  }
})
