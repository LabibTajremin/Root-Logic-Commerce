import { describe, expect, it } from 'vitest'
import { slugify, uniqueSlug } from './slug'
import { assertNoCycle, productInput, toSortOrders } from './rules'

describe('slugify', () => {
  it.each([
    ['Wooden Door Bell — Brass Chime', 'wooden-door-bell-brass-chime'],
    ['Café Crème 2kg', 'cafe-creme-2kg'],
    ['আতর', 'ator'],
    ['সরিষার তেল ১ লিটার', 'sorishar-tel-1-litar'],
    ['চাল', 'chal'],
    ['!!!', ''],
  ])('%s → %s', (a, b) => expect(slugify(a)).toBe(b))
})

describe('uniqueSlug', () => {
  it('suffixes until free and falls back to a short id', async () => {
    const taken = new Set(['rice', 'rice-2'])
    expect(
      await uniqueSlug(
        'Rice',
        async (s) => taken.has(s),
        () => 'x',
      ),
    ).toBe('rice-3')
    expect(
      await uniqueSlug(
        '★',
        async () => false,
        () => 'ab12',
      ),
    ).toBe('p-ab12')
  })
})

describe('category rules', () => {
  const tree = [
    { id: 'a', parentId: null },
    { id: 'b', parentId: 'a' },
    { id: 'c', parentId: 'b' },
  ]
  it('allows valid moves and rejects cycles', () => {
    expect(() => assertNoCycle(tree, 'c', 'a')).not.toThrow()
    expect(() => assertNoCycle(tree, 'a', null)).not.toThrow()
    expect(() => assertNoCycle(tree, 'a', 'c')).toThrow('category.cycle')
    expect(() => assertNoCycle(tree, 'a', 'a')).toThrow('category.cycle')
    expect(() => assertNoCycle(tree, 'x', 'ghost')).not.toThrow()
  })
  it('turns an ordered id list into sort orders', () => {
    expect(toSortOrders(['b', 'a'])).toEqual([
      { id: 'b', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
    ])
  })
})

describe('productInput', () => {
  it('applies defaults', () => {
    expect(productInput.parse({ name: ' Mug ', price: 85000 })).toMatchObject({
      name: 'Mug',
      status: 'draft',
      costPrice: 0,
      stock: 0,
      compareAtPrice: null,
    })
  })
  it('requires compare-at price above price', () => {
    expect(productInput.safeParse({ name: 'x', price: 100, compareAtPrice: 100 }).success).toBe(
      false,
    )
    expect(productInput.safeParse({ name: 'x', price: 100, compareAtPrice: 120 }).success).toBe(
      true,
    )
  })
})
