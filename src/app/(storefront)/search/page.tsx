import { ProductListing } from '../product-listing'
import { storefront } from '../storefront'

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> }

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams
  const q = String(params.q ?? '').trim()
  const { store, catalog, theme, categories, t } = await storefront()
  const { CategoryNav } = theme.slots
  const products = await catalog.listProducts(store.id, {
    status: 'active',
    search: q || undefined,
  })
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
      {q ? (
        <p role="status" className="text-muted">
          {t('shop.results', { n: products.length, q })}
        </p>
      ) : (
        <CategoryNav categories={categories} allLabel={t('shop.all')} />
      )}
      <ProductListing products={products} path="/search" params={params} extra={q ? { q } : {}} />
    </section>
  )
}
