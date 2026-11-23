/** A11: what a product list can be filtered and sorted by, read from the URL. */
export const listingSorts = ['featured', 'new', 'price_asc', 'price_desc', 'best'] as const
export const perPages = [6, 12, 24, 48] as const
export const gridCols = [2, 3, 4] as const

export type Listing = {
  min: number | null
  max: number | null
  brand: string | null
  inStock: boolean
  /** Option name → accepted values (any of them). */
  opts: Record<string, string[]>
  sort: (typeof listingSorts)[number]
  per: number
  page: number
  cols: number | null
}
export type ListItem = {
  id: string
  price: number
  inStock: boolean
  brandId: string | null
  /** Option name → the values this product comes in. */
  options: Record<string, string[]>
  sold: number
  createdAt: Date
  sortOrder: number
}
type Params = Record<string, string | string[] | undefined>

const one = (v: Params[string]) => (Array.isArray(v) ? v[0] : v)
const all = (v: Params[string]) => [v ?? []].flat()
const taka = (v: Params[string]) => {
  const n = Number(one(v))
  return one(v) && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}
const pick = <T extends string | number | null>(
  list: readonly T[],
  v: T | undefined,
  fallback: T,
) => (list.includes(v as T) ? (v as T) : fallback)

export const parseListing = (p: Params): Listing => {
  const opts: Record<string, string[]> = {}
  for (const o of all(p.opt)) {
    const i = o.indexOf(':')
    if (i > 0) (opts[o.slice(0, i)] ??= []).push(o.slice(i + 1))
  }
  const page = Math.floor(Number(one(p.page)))
  return {
    min: taka(p.min),
    max: taka(p.max),
    brand: one(p.brand) || null,
    inStock: one(p.stock) === '1',
    opts,
    sort: pick(listingSorts, one(p.sort) as Listing['sort'], 'featured'),
    per: pick(perPages, Number(one(p.per)) as 12, 24),
    page: page >= 1 ? page : 1,
    cols: pick<number | null>(gridCols, Number(one(p.cols)), null),
  }
}

const order: Record<Listing['sort'], (a: ListItem, b: ListItem) => number> = {
  featured: (a, b) => a.sortOrder - b.sortOrder,
  new: (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  price_asc: (a, b) => a.price - b.price,
  price_desc: (a, b) => b.price - a.price,
  best: (a, b) => b.sold - a.sold,
}

export const applyListing = <T extends ListItem>(items: T[], q: Listing) => {
  const hit = items
    .filter(
      (i) =>
        (q.min === null || i.price >= q.min) &&
        (q.max === null || i.price <= q.max) &&
        (q.brand === null || i.brandId === q.brand) &&
        (!q.inStock || i.inStock) &&
        Object.entries(q.opts).every(([name, values]) =>
          values.some((v) => i.options[name]?.includes(v)),
        ),
    )
    .sort(order[q.sort])
  const pages = Math.max(1, Math.ceil(hit.length / q.per))
  const page = Math.min(q.page, pages)
  return { items: hit.slice((page - 1) * q.per, page * q.per), total: hit.length, page, pages }
}

/** A link to the same list with some settings changed; defaults are left out of the URL. */
export const listingHref = (
  path: string,
  q: Listing,
  change: Partial<Listing>,
  extra: Record<string, string> = {},
) => {
  const n = { ...q, ...change }
  const s = new URLSearchParams(extra)
  if (n.min !== null) s.set('min', String(n.min / 100))
  if (n.max !== null) s.set('max', String(n.max / 100))
  if (n.brand) s.set('brand', n.brand)
  if (n.inStock) s.set('stock', '1')
  for (const [name, values] of Object.entries(n.opts))
    for (const v of values) s.append('opt', `${name}:${v}`)
  if (n.sort !== 'featured') s.set('sort', n.sort)
  if (n.per !== 24) s.set('per', String(n.per))
  if (n.page > 1) s.set('page', String(n.page))
  if (n.cols) s.set('cols', String(n.cols))
  const qs = s.toString()
  return qs ? `${path}?${qs}` : path
}
