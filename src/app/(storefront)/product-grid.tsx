import Link from 'next/link'
import type { Product } from '@/modules/catalog'
import type { Design } from '@/modules/site-settings'
import type { ProductView } from '@/themes'
import { AddToCart } from './cart-buttons'
import { storefront } from './storefront'

const cardView = (v: ProductView, show: Design['productCard']): ProductView => ({
  ...v,
  badges: show.badges ? v.badges : [],
  compareAt: show.oldPrice ? v.compareAt : null,
})

export const ProductGrid = async ({ products }: { products: Product[] }) => {
  const { theme, design, view, imagesOf, t } = await storefront()
  const { ProductCard, EmptyState } = theme.slots
  if (products.length === 0)
    return (
      <EmptyState
        level={2}
        title={t('shop.noProducts')}
        body={t('shop.noProductsBody')}
        action={
          <Link href="/" className="font-semibold underline">
            {t('shop.home')}
          </Link>
        }
      />
    )
  const images = await imagesOf(products)
  const show = design.productCard
  return (
    <ul
      data-showcase={design.style.showcase}
      className="rlc-grid grid grid-cols-2 gap-4 md:grid-cols-4"
    >
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard
            product={cardView(view(p, images.get(p.id)!), show)}
            labels={{ soldOut: t('shop.soldOut'), left: t('shop.left') }}
            action={
              show.button && (
                <AddToCart
                  item={{ id: p.id, slug: p.slug, name: p.name, price: p.price }}
                  label={t('shop.addToCart')}
                />
              )
            }
          />
        </li>
      ))}
    </ul>
  )
}
