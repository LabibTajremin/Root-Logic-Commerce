/** A15: the product sheet columns, in export order. */
export const csvColumns = [
  'slug',
  'name',
  'variant',
  'price',
  'compare_at',
  'cost',
  'stock',
  'sku',
  'status',
  'category',
  'description',
  'images',
] as const

const quote = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
export const toCsv = (rows: string[][]) => rows.map((r) => r.map(quote).join(',') + '\r\n').join('')

/** RFC 4180: quoted fields may hold commas, quotes ("") and new lines. Blank lines are dropped. */
export const parseCsv = (text: string): string[][] => {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const s = text.replace(/^﻿/, '')
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!
    if (quoted) {
      if (c === '"' && s[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  rows.push([...row, cell])
  return rows.filter((r) => r.some((x) => x !== ''))
}

export type CsvProduct = {
  slug: string
  name: string
  /** Set on a variant row: which combination (it must already exist on the product). */
  variant: Record<string, string> | null
  price: number
  compareAtPrice: number | null
  costPrice: number
  stock: number
  sku: string | null
  status: 'draft' | 'active' | 'archived'
  category: string | null
  description: string
  images: string[]
}
export type RowResult = { ok: true; value: CsvProduct } | { ok: false; errors: string[] }

const money = (v: string) => (/^\d+(\.\d{1,2})?$/.test(v) ? Math.round(Number(v) * 100) : NaN)
const list = (v: string) =>
  v
    .split('|')
    .map((x) => x.trim())
    .filter(Boolean)
const statuses = ['draft', 'active', 'archived'] as const

/** One sheet row → a product (or variant) update; errors name the bad columns. */
export const readRow = (head: string[], cells: string[]): RowResult => {
  if (!csvColumns.every((c) => head.includes(c))) return { ok: false, errors: ['columns'] }
  const get = (c: (typeof csvColumns)[number]) => (cells[head.indexOf(c)] ?? '').trim()
  const pairs = list(get('variant')).map((p) => p.split('='))
  const compare = get('compare_at')
  const v: CsvProduct = {
    slug: get('slug'),
    name: get('name'),
    variant:
      pairs.length > 0
        ? Object.fromEntries(pairs.map(([k, x]) => [k!.trim(), (x ?? '').trim()]))
        : null,
    price: money(get('price')),
    compareAtPrice: compare ? money(compare) : null,
    costPrice: get('cost') ? money(get('cost')) : 0,
    stock: /^\d+$/.test(get('stock')) ? Number(get('stock')) : NaN,
    sku: get('sku') || null,
    status: (get('status') || 'draft') as CsvProduct['status'],
    category: get('category') || null,
    description: get('description'),
    images: list(get('images')),
  }
  const errors = [
    !/^[a-z0-9-]+$/.test(v.slug) && 'slug',
    Number.isNaN(v.price) && 'price',
    Number.isNaN(v.stock) && 'stock',
    !statuses.includes(v.status) && 'status',
    pairs.some((p) => p.length !== 2 || !p[0]!.trim() || !p[1]!.trim()) && 'variant',
  ].filter((e): e is string => Boolean(e))
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: v }
}
