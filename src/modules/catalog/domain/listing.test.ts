import { describe, expect, it } from 'vitest'
import { applyListing, hasFilters, listingHref, parseListing, type ListItem } from './listing'

const item = (id: string, o: Partial<ListItem> = {}): ListItem => ({
  id,
  price: 1000,
  inStock: true,
  brandId: null,
  options: {},
  sold: 0,
  createdAt: new Date(2026, 0, Number(id.slice(1))),
  sortOrder: 0,
  ...o,
})

describe('listing query (A11)', () => {
  it('reads filters from the URL and ignores junk', () => {
    expect(
      parseListing({
        min: '100',
        max: '250.5',
        brand: 'b1',
        stock: '1',
        opt: ['Size:M', 'Colour:Red', 'junk'],
        sort: 'price_asc',
        per: '12',
        page: '2',
        cols: '3',
      }),
    ).toEqual({
      min: 10000,
      max: 25050,
      brand: 'b1',
      inStock: true,
      opts: { Size: ['M'], Colour: ['Red'] },
      sort: 'price_asc',
      per: 12,
      page: 2,
      cols: 3,
    })
    expect(
      parseListing({
        min: 'x',
        max: '-5',
        sort: 'evil',
        per: '7',
        page: '-1',
        cols: '9',
        opt: 'Size:L',
      }),
    ).toEqual({
      min: null,
      max: null,
      brand: null,
      inStock: false,
      opts: { Size: ['L'] },
      sort: 'featured',
      per: 24,
      page: 1,
      cols: null,
    })
  })

  it('filters, sorts and pages', () => {
    const items = [
      item('d1', { price: 500, sold: 3, sortOrder: 2 }),
      item('d2', {
        price: 1500,
        brandId: 'b1',
        options: { Size: ['M', 'L'] },
        sold: 9,
        sortOrder: 1,
      }),
      item('d3', { price: 900, inStock: false, options: { Size: ['S'] }, sortOrder: 0 }),
    ]
    const ids = (q: Record<string, string | string[]>) =>
      applyListing(items, parseListing(q)).items.map((i) => i.id)
    expect(ids({})).toEqual(['d3', 'd2', 'd1'])
    expect(ids({ sort: 'price_asc' })).toEqual(['d1', 'd3', 'd2'])
    expect(ids({ sort: 'price_desc' })).toEqual(['d2', 'd3', 'd1'])
    expect(ids({ sort: 'new' })).toEqual(['d3', 'd2', 'd1'])
    expect(ids({ sort: 'best' })).toEqual(['d2', 'd1', 'd3'])
    expect(ids({ min: '6', max: '10' })).toEqual(['d3'])
    expect(ids({ brand: 'b1' })).toEqual(['d2'])
    expect(ids({ stock: '1' })).toEqual(['d2', 'd1'])
    expect(ids({ opt: ['Size:M', 'Size:S'] })).toEqual(['d3', 'd2'])
    const paged = applyListing(items, parseListing({ per: '12', page: '9' }))
    expect([paged.page, paged.pages, paged.total, paged.items.length]).toEqual([1, 1, 3, 3])
    expect(applyListing([], parseListing({})).pages).toBe(1)
  })

  it('knows when any filter is set', () => {
    expect(hasFilters(parseListing({ sort: 'new', page: '2' }))).toBe(false)
    for (const p of [{ min: '1' }, { max: '1' }, { brand: 'b' }, { stock: '1' }, { opt: 'Size:M' }])
      expect(hasFilters(parseListing(p))).toBe(true)
  })

  it('builds links that keep the other filters', () => {
    const q = parseListing({ sort: 'new', opt: ['Size:M'], page: '2', cols: '3', min: '10' })
    expect(listingHref('/c/tea', q, { page: 3 })).toBe(
      '/c/tea?min=10&opt=Size%3AM&sort=new&page=3&cols=3',
    )
    expect(listingHref('/search', parseListing({}), {}, { q: 'tea' })).toBe('/search?q=tea')
    expect(listingHref('/b/x', parseListing({}), {})).toBe('/b/x')
    const full = parseListing({ max: ['50', '9'], brand: 'b1', stock: '1', per: '6' })
    expect(listingHref('/b/x', full, {})).toBe('/b/x?max=50&brand=b1&stock=1&per=6')
  })
})
