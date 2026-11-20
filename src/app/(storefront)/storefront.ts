import { cache } from 'react'
import { translate } from '@/i18n'
import type { Product } from '@/modules/catalog'
import { formatMoney } from '@/modules/shared'
import { runtime } from '@/server/runtime'
import { currentLocale, currentSettings, currentStore } from '@/server/request'
import { loadTheme, type ProductView } from '@/themes'

/** Everything a storefront page needs for the store resolved from the Host header. */
export const storefront = cache(async () => {
  const [store, locale, { design, business }, { container }] = await Promise.all([
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
  const view = (p: Product): ProductView => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    price: money(p.price),
    compareAt: p.compareAtPrice === null ? null : money(p.compareAtPrice),
    inStock: p.stock > 0,
  })
  const live = categories.filter((c) => !c.archived)
  return {
    store: { ...store, name: design.brand.name },
    locale,
    design,
    business,
    theme,
    t,
    money,
    view,
    credit: !unbranded,
    categories: live.filter((c) => !c.parentId).map((c) => ({ name: c.name, slug: c.slug })),
    allCategories: live,
    catalog: container.catalog,
    orders: container.orders,
  }
})
