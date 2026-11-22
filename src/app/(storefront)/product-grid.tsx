import Link from 'next/link'
import type { Product } from '@/modules/catalog'
import { AddToCart } from './cart-buttons'
import { storefront } from './storefront'

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
  return (
    <ul
      data-showcase={design.style.showcase}
      className="rlc-grid grid grid-cols-2 gap-4 md:grid-cols-4"
    >
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard
            product={view(p, images.get(p.id)!)}
            labels={{ soldOut: t('shop.soldOut'), left: t('shop.left') }}
            action={
              <AddToCart
                item={{ id: p.id, slug: p.slug, name: p.name, price: p.price }}
                label={t('shop.addToCart')}
              />
            }
          />
        </li>
      ))}
    </ul>
  )
}
