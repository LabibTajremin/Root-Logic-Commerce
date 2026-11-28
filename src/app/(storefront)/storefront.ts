import { cookies } from 'next/headers'
import { cache } from 'react'
import { translate } from '@/i18n'
import { cardBadges, stockLeft, type Product } from '@/modules/catalog'
import { flashLive, flashPrice } from '@/modules/deals'
import { formatMoney } from '@/modules/shared'
import { runtime } from '@/server/runtime'
import { PREVIEW_COOKIE, readPreview } from '@/server/preview'
import { currentLocale, currentSettings, currentStore } from '@/server/request'
import { layoutOf, presetLayout, previewPreset } from '@/sections/registry'
import type { MediaRow } from '@/modules/media'
import type { FeatureId } from '@/modules/plans'
import { brandImages } from '@/modules/site-settings'
import { loadTheme, type ImageView, type ProductView } from '@/themes'

/** Everything a storefront page needs for the store resolved from the Host header. */
export const storefront = cache(async () => {
  const [store, locale, { design, business, layout }, { container, config }, jar] =
    await Promise.all([currentStore(), currentLocale(), currentSettings(), runtime(), cookies()])
  // Owner-only layout preview: a cookie signed for this store, set from the layout gallery.
  const preview = previewPreset(
    readPreview(config.authSecret, store.id, jar.get(PREVIEW_COOKIE)?.value),
  )
  const [theme, categories, unbranded, features] = await Promise.all([
    loadTheme(design.themeId),
    container.catalog.listCategories(store.id),
    container.plans.has(store.id, 'removeBranding'),
    container.features.list(store.id),
  ])
  const active = new Set(features.filter((f) => f.active).map((f) => f.id))
  const t = (k: string, v?: Record<string, string | number>) =>
    translate(locale, k, v, business.texts[locale])
  const moneyFormat = { banglaDigits: business.banglaDigits, currency: business.currency }
  const money = (minor: number) => formatMoney(minor, moneyFormat)
  const image = (m: MediaRow): ImageView => ({ src: `/api/media/${m.id}`, color: m.dominantColor })
  // B11: while the sale runs (and its module is on) listed products show their sale price.
  const now = new Date()
  const sale =
    active.has('flashSales') && flashLive(business.flashSale, now) ? business.flashSale : null
  const sold = sale ? await container.orders.flashSold(store.id, sale) : new Map<string, number>()
  /** What one unit costs right now. */
  const priceOf = (p: { id: string; price: number }) =>
    flashPrice(sale, p.id, p.price, now, sold.get(p.id)) ?? p.price
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
  const view = (p: Product, images: ImageView[]): ProductView => {
    const price = priceOf(p)
    // On sale, the usual price becomes the crossed-out one.
    const was = price < p.price ? (p.compareAtPrice ?? p.price) : p.compareAtPrice
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: money(price),
      compareAt: was === null ? null : money(was),
      badges: [
        ...(price < p.price ? [{ text: t('flash.badge'), tone: 'accent' as const }] : []),
        ...cardBadges({ ...p, price, compareAtPrice: was }, (pct) => t('shop.save', { pct })),
      ],
      left: stockLeft(p, business.showStockLeft),
      inStock: p.stock > 0,
      image: images[0] ?? null,
    }
  }
  const live = categories.filter((c) => !c.archived)
  return {
    store: {
      ...store,
      name: design.brand.name,
      showName: design.brand.showName,
      ...brandImages(design),
    },
    locale,
    design,
    business,
    moneyFormat,
    /** Is this module switched on (J5) for the store? */
    on: (id: FeatureId) => active.has(id),
    layout: preview ? presetLayout(preview) : layoutOf(layout),
    preview,
    theme,
    t,
    money,
    view,
    priceOf,
    sale,
    imagesOf,
    credit: !unbranded,
    categories: live.filter((c) => !c.parentId).map((c) => ({ name: c.name, slug: c.slug })),
    allCategories: live,
    catalog: container.catalog,
    pages: container.pages,
    landing: container.landing,
    orders: container.orders,
    drafts: container.drafts,
    reviews: container.reviews,
    otp: container.otp,
    fraud: container.fraud,
    promotions: container.promotions,
    limits: container.limits,
  }
})
