import Link from 'next/link'
import { ProductGrid } from './product-grid'
import { storefront } from './storefront'

export default async function HomePage() {
  const { theme, store, categories, catalog, t } = await storefront()
  const { Hero, CategoryNav } = theme.slots
  const products = await catalog.listProducts(store.id, { status: 'active' })
  return (
    <>
      <Hero
        store={store}
        title={store.name}
        sub={`${t('shop.delivery')} · ${t('shop.cod')}`}
        cta={
          <Link
            href="#products"
            className="inline-flex min-h-11 items-center rounded-control bg-button px-6 font-semibold text-button-text"
          >
            {t('shop.shop')}
          </Link>
        }
      />
      <section id="products" className="mx-auto flex max-w-6xl flex-col gap-6 px-4">
        <CategoryNav categories={categories} allLabel={t('shop.all')} />
        <h2 className="font-heading text-2xl">{t('shop.products')}</h2>
        <ProductGrid products={products} />
      </section>
    </>
  )
}
