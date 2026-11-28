import { describe, expect, it } from 'vitest'
import { comboSchema, flashSaleSchema } from './deals'

const A = '00000000-0000-4000-8000-00000000000a'
const B = '00000000-0000-4000-8000-00000000000b'

describe('deal settings', () => {
  it('validates combos: two or more different products, a price', () => {
    const c = comboSchema.parse({
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Eid set',
      slug: 'Eid-Set',
      items: [
        { productId: A, qty: 1 },
        { productId: B, qty: 2 },
      ],
      price: 1500,
    })
    expect(c).toMatchObject({ slug: 'eid-set', on: true })
    expect(comboSchema.safeParse({ ...c, items: [c.items[0]] }).success).toBe(false)
    expect(comboSchema.safeParse({ ...c, items: [c.items[0], c.items[0]] }).success).toBe(false)
  })

  it('validates a flash sale: an end after its start, a price or a percent per product', () => {
    const s = flashSaleSchema.parse({
      name: 'Friday',
      startsAt: '2026-12-01T00:00:00Z',
      endsAt: '2026-12-02T00:00:00Z',
      items: [{ productId: A, percent: 20 }],
    })
    expect(s).toMatchObject({ on: true, cap: null, items: [{ price: null, percent: 20 }] })
    expect(s.startsAt).toBeInstanceOf(Date)
    expect(flashSaleSchema.safeParse({ ...s, endsAt: s.startsAt }).success).toBe(false)
    expect(
      flashSaleSchema.safeParse({ ...s, items: [{ productId: A, price: 100, percent: 20 }] })
        .success,
    ).toBe(false)
    expect(flashSaleSchema.safeParse({ ...s, items: [{ productId: A }] }).success).toBe(false)
  })
})
