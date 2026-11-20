import type { MetadataRoute } from 'next'
import { origin } from './origin'
import { storefront } from './storefront'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ store, catalog, allCategories }, base] = await Promise.all([storefront(), origin()])
  const products = await catalog.listProducts(store.id, { status: 'active' })
  return [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    ...allCategories.map((c) => ({
      url: `${base}/c/${c.slug}`,
      changeFrequency: 'weekly' as const,
    })),
    ...products.map((p) => ({ url: `${base}/p/${p.slug}`, changeFrequency: 'weekly' as const })),
  ]
}
