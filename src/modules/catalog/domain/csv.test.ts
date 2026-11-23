import { describe, expect, it } from 'vitest'
import { csvColumns, parseCsv, readRow, toCsv } from './csv'

describe('CSV (A15)', () => {
  it('round-trips quotes, commas, new lines and Bangla', () => {
    const rows = [
      ['a', 'b, c', 'say "hi"'],
      ['চা', 'line1\nline2', ''],
    ]
    const text = toCsv(rows)
    expect(text).toBe('a,"b, c","say ""hi"""\r\nচা,"line1\nline2",\r\n')
    expect(parseCsv(text)).toEqual(rows)
    expect(parseCsv('x,y\n1,2')).toEqual([
      ['x', 'y'],
      ['1', '2'],
    ])
    expect(parseCsv('﻿x\r\n\r\n')).toEqual([['x']])
  })

  it('reads a product row, or says what is wrong with it', () => {
    const head = [...csvColumns]
    const row = (o: Record<string, string>) => head.map((h) => o[h] ?? '')
    expect(
      readRow(
        head,
        row({
          slug: 'tea',
          name: 'Tea',
          price: '120.5',
          stock: '3',
          status: 'active',
          images: 'a | b',
        }),
      ),
    ).toEqual({
      ok: true,
      value: {
        slug: 'tea',
        name: 'Tea',
        variant: null,
        price: 12050,
        compareAtPrice: null,
        costPrice: 0,
        stock: 3,
        sku: null,
        status: 'active',
        category: null,
        description: '',
        images: ['a', 'b'],
      },
    })
    expect(
      readRow(
        head,
        row({
          slug: 'tea',
          variant: 'Size=M | Colour=Red',
          price: '1',
          stock: '0',
          cost: '2',
          compare_at: '5',
          sku: 'T-1',
          category: 'Drinks',
        }),
      ),
    ).toMatchObject({
      ok: true,
      value: {
        variant: { Size: 'M', Colour: 'Red' },
        compareAtPrice: 500,
        costPrice: 200,
        sku: 'T-1',
        category: 'Drinks',
        status: 'draft',
      },
    })
    expect(
      readRow(
        head,
        row({ slug: 'Bad Slug', price: 'x', stock: '-1', status: 'nope', variant: 'oops' }),
      ),
    ).toEqual({
      ok: false,
      errors: ['slug', 'price', 'stock', 'status', 'variant'],
    })
    expect(readRow(['slug'], ['tea'])).toEqual({ ok: false, errors: ['columns'] })
    // A short row: missing cells read as empty.
    expect(readRow(head, ['tea'])).toEqual({ ok: false, errors: ['price', 'stock'] })
  })
})
