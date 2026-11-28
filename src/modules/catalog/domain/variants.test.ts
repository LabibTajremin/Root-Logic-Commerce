import { describe, expect, it } from 'vitest'
import {
  mergeMatrix,
  optionsFromText,
  optionsToText,
  productOptions,
  variantInput,
  variantLabel,
} from './variants'

describe('product options and variants (A1)', () => {
  it('reads "Name: a, b" lines, drops empty or duplicate values and nameless lines', () => {
    const o = optionsFromText('Size: S, M, , M ,L\n\n Colour : Red,Blue\nno values:\n: x')
    expect(o).toEqual([
      { name: 'Size', values: ['S', 'M', 'L'] },
      { name: 'Colour', values: ['Red', 'Blue'] },
    ])
    expect(optionsFromText(optionsToText(o))).toEqual(o)
    expect(productOptions.parse(undefined)).toEqual([])
    expect(
      productOptions.safeParse([
        { name: 'A', values: ['x'] },
        ...Array(3).fill({ name: 'B', values: ['y'] }),
      ]).success,
    ).toBe(false)
  })

  it('labels a variant in option order', () => {
    const o = optionsFromText('Size: S, M\nColour: Red')
    expect(variantLabel(o, { Colour: 'Red', Size: 'M' })).toBe('M / Red')
  })

  it('builds every combination, keeping rows the owner already priced', () => {
    const o = optionsFromText('Size: S, M\nColour: Red, Blue')
    const kept = { id: 'v1', options: { Size: 'M', Colour: 'Blue' }, price: 900, stock: 4 }
    const rows = mergeMatrix(
      o,
      [kept, { id: 'gone', options: { Size: 'XL', Colour: 'Red' }, price: 1, stock: 1 }],
      {
        price: 500,
        stock: 0,
      },
    )
    expect(rows.map((r) => [variantLabel(o, r.options), r.id ?? null, r.price])).toEqual([
      ['S / Red', null, 500],
      ['S / Blue', null, 500],
      ['M / Red', null, 500],
      ['M / Blue', 'v1', 900],
    ])
    expect(mergeMatrix([], [kept], { price: 1, stock: 0 })).toEqual([])
  })

  it('validates a variant price row', () => {
    const ok = {
      options: { Size: 'S' },
      price: 500,
      compareAtPrice: null,
      costPrice: 0,
      stock: 2,
      sku: null,
    }
    expect(variantInput.parse(ok)).toEqual(ok)
    expect(variantInput.safeParse({ ...ok, compareAtPrice: 400 }).success).toBe(false)
    expect(variantInput.safeParse({ ...ok, stock: -1 }).success).toBe(false)
  })
})
