import { feedItems } from '@/modules/catalog'
import { origin } from '../origin'
import { storefront } from '../storefront'

/** H10: the shop's live products for ad catalogs — demo products never go to ads. */
export const shopFeed = async () => {
  const [{ store, catalog, allCategories, business, imagesOf }, base] = await Promise.all([
    storefront(),
    origin(),
  ])
  const products = (await catalog.listProducts(store.id, { status: 'active' })).filter(
    (p) => !p.demo,
  )
  const [variants, brands, images] = await Promise.all([
    catalog.listVariants(
      store.id,
      products.map((p) => p.id),
    ),
    catalog.listBrands(store.id),
    imagesOf(products),
  ])
  const items = feedItems(
    products.map((p) => ({
      ...p,
      brand: brands.find((b) => b.id === p.brandId)?.name ?? store.name,
      category: allCategories.find((c) => c.id === p.categoryId)?.name ?? '',
      images: images.get(p.id)!.map((i) => `${base}${i.src}`),
      variants: variants.filter((v) => v.productId === p.id),
    })),
    base,
    business.currency,
  )
  return { items, shop: { title: store.name, link: base } }
}
