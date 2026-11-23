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
      className="rlc-grid grid grid-cols-[repeat(var(--cols-mobile),minmax(0,1fr))] gap-4 md:grid-cols-[repeat(var(--cols-desktop),minmax(0,1fr))]"
    >
      {products.map((p) => (
        <li key={p.id}>
          <ProductCard
            product={cardView(view(p, images.get(p.id)!), show)}
            labels={{ soldOut: t('shop.soldOut'), left: t('shop.left') }}
            action={
              show.button &&
              // A product with sizes/colours is added from its page, once one is picked.
              (p.options.length > 0 ? (
                <a
                  href={`/p/${p.slug}`}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold"
                >
                  {t('shop.chooseOptions')}
                </a>
              ) : (
                <AddToCart
                  item={{
                    id: p.id,
                    productId: p.id,
                    variantId: null,
                    slug: p.slug,
                    name: p.name,
                    price: p.price,
                  }}
                  label={t('shop.addToCart')}
                />
              ))
            }
          />
        </li>
      ))}
    </ul>
  )
}
