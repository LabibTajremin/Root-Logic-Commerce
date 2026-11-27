import Link from 'next/link'
import { didYouMean, searchProducts } from '@/modules/catalog'
import { ProductGrid } from '../product-grid'
import { ProductListing } from '../product-listing'
import { storefront } from '../storefront'
import { TrackOnView } from '../ga'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const q = String(params.q ?? '').trim()
  const { store, catalog, theme, categories, allCategories, t } = await storefront()
  const { CategoryNav } = theme.slots
  const [active, brands] = await Promise.all([
    catalog.listProducts(store.id, { status: 'active' }),
    catalog.listBrands(store.id),
  ])
  // Category and brand names count as words of the product, so "aarong" or "saree" finds it.
  const searchable = active.map((p) => ({
    ...p,
    keywords: [
      allCategories.find((c) => c.id === p.categoryId)?.name,
      brands.find((b) => b.id === p.brandId)?.name,
    ].filter((k): k is string => !!k),
  }))
  const products = searchProducts(searchable, q)
  const suggestion = q && products.length === 0 ? didYouMean(searchable, q) : null
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="font-heading text-3xl">{t('shop.search')}</h1>
      <form role="search" action="/search" className="flex gap-2">
        <label htmlFor="q" className="sr-only">
          {t('shop.searchPlaceholder')}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder={t('shop.searchPlaceholder')}
          className="min-h-11 flex-1 rounded-control border border-line bg-surface px-3"
        />
        <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
          {t('shop.search')}
        </button>
      </form>
      {q && <TrackOnView name="search" params={{ search_term: q }} />}
      {q ? (
        <p role="status" className="text-muted">
          {t('shop.results', { n: products.length, q })}
        </p>
      ) : (
        <CategoryNav categories={categories} allLabel={t('shop.all')} />
      )}
      {q && products.length === 0 ? (
        // No dead end: a corrected search, the categories and what is new.
        <div className="flex flex-col gap-4" data-testid="no-results">
          <p className="text-muted">{t('shop.noResultsTip')}</p>
          {suggestion && (
            <p>
              {t('shop.didYouMean')}{' '}
              <Link
                href={`/search?q=${encodeURIComponent(suggestion)}`}
                className="font-semibold underline"
              >
                {suggestion}
              </Link>
            </p>
          )}
          <CategoryNav categories={categories} allLabel={t('shop.all')} />
          <h2 className="font-heading text-xl">{t('shop.newArrivals')}</h2>
          <ProductGrid
            products={[...active].sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 4)}
          />
        </div>
      ) : (
        <ProductListing products={products} path="/search" params={params} extra={q ? { q } : {}} />
      )}
    </section>
  )
}
