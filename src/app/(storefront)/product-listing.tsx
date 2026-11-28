import {
  applyListing,
  gridCols,
  hasFilters,
  listingHref,
  listingSorts,
  parseListing,
  perPages,
  type Product,
} from '@/modules/catalog'
import { ProductGrid } from './product-grid'
import { storefront } from './storefront'

type Params = Record<string, string | string[] | undefined>
const box = 'min-h-11 rounded-control border border-line bg-surface px-3'

/**
 * A11: filters (price, brand, options, in stock), sort, page size, grid columns and
 * pages for any product list. A plain GET form and links — works without JavaScript.
 */
export const ProductListing = async ({
  products,
  path,
  params,
  extra,
}: {
  products: Product[]
  path: string
  params: Params
  /** Query values the page itself owns (e.g. the search text). */
  extra: Record<string, string>
}) => {
  const { catalog, store, t } = await storefront()
  const q = parseListing(params)
  const items = await catalog.listingItems(store.id, products)
  const result = applyListing(items, q)
  const brandIds = new Set(items.map((i) => i.brandId))
  const brands = (await catalog.listBrands(store.id)).filter(
    (b) => !b.archived && brandIds.has(b.id),
  )
  const facets = new Map<string, Set<string>>()
  for (const i of items)
    for (const [name, values] of Object.entries(i.options))
      for (const v of values) facets.set(name, (facets.get(name) ?? new Set()).add(v))
  const href = (change: Parameters<typeof listingHref>[2]) => listingHref(path, q, change, extra)
  return (
    <div className="flex flex-col gap-4">
      <form
        method="get"
        action={path}
        aria-label={t('list.filters')}
        className="flex flex-col gap-3"
      >
        {Object.entries(extra).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <details className="rounded-card border border-line p-3" open={hasFilters(q)}>
          <summary className="min-h-11 cursor-pointer content-center font-semibold">
            {t('list.filters')}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <fieldset className="flex items-end gap-2">
              <legend className="mb-1 text-sm font-semibold">{t('list.price')}</legend>
              <label className="flex flex-1 flex-col text-xs" htmlFor="min">
                {t('list.min')}
                <input
                  id="min"
                  name="min"
                  type="number"
                  min={0}
                  defaultValue={q.min === null ? '' : q.min / 100}
                  className={box}
                />
              </label>
              <label className="flex flex-1 flex-col text-xs" htmlFor="max">
                {t('list.max')}
                <input
                  id="max"
                  name="max"
                  type="number"
                  min={0}
                  defaultValue={q.max === null ? '' : q.max / 100}
                  className={box}
                />
              </label>
            </fieldset>
            {brands.length > 0 && (
              <div className="flex flex-col gap-1 text-sm font-semibold">
                <label htmlFor="brand">{t('shop.brand')}</label>
                <select
                  id="brand"
                  name="brand"
                  defaultValue={q.brand ?? ''}
                  className={`${box} font-normal`}
                >
                  <option value="">{t('shop.all')}</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {[...facets].map(([name, values]) => (
              <fieldset key={name} className="flex flex-col gap-1">
                <legend className="mb-1 text-sm font-semibold">{name}</legend>
                <div className="flex flex-wrap gap-x-3">
                  {[...values].map((v) => (
                    <label key={v} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="opt"
                        value={`${name}:${v}`}
                        defaultChecked={q.opts[name]?.includes(v)}
                        className="size-5"
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <label className="flex min-h-11 items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                name="stock"
                value="1"
                defaultChecked={q.inStock}
                className="size-5"
              />
              {t('list.inStock')}
            </label>
          </div>
        </details>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1 text-sm font-semibold">
            <label htmlFor="sort">{t('list.sort')}</label>
            <select id="sort" name="sort" defaultValue={q.sort} className={`${box} font-normal`}>
              {listingSorts.map((s) => (
                <option key={s} value={s}>
                  {t(`list.sort_${s}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 text-sm font-semibold">
            <label htmlFor="per">{t('list.per')}</label>
            <select id="per" name="per" defaultValue={q.per} className={`${box} font-normal`}>
              {perPages.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          {q.cols && <input type="hidden" name="cols" value={q.cols} />}
          <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
            {t('list.apply')}
          </button>
          <nav aria-label={t('list.cols')} className="ms-auto hidden items-center gap-1 md:flex">
            {gridCols.map((c) => (
              <a
                key={c}
                href={href({ cols: c, page: 1 })}
                aria-current={q.cols === c ? 'true' : undefined}
                className="flex size-11 items-center justify-center rounded-control border border-line text-sm aria-[current]:border-[var(--color-button)] aria-[current]:font-semibold"
              >
                {c}
              </a>
            ))}
          </nav>
        </div>
      </form>
      <p className="text-sm text-muted" data-testid="list-count">
        {t('list.count', { n: result.total })}
      </p>
      <ProductGrid products={result.items.map((i) => i.product)} cols={q.cols} />
      {result.pages > 1 && (
        <nav aria-label={t('list.pages')} className="flex flex-wrap justify-center gap-1">
          {Array.from({ length: result.pages }, (_, i) => i + 1).map((n) => (
            <a
              key={n}
              href={href({ page: n })}
              aria-current={n === result.page ? 'page' : undefined}
              className="flex size-11 items-center justify-center rounded-control border border-line text-sm aria-[current]:bg-button aria-[current]:text-button-text"
            >
              {n}
            </a>
          ))}
        </nav>
      )}
    </div>
  )
}
