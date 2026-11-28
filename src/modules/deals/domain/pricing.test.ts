import { describe, expect, it } from 'vitest'
import {
  comboPercent,
  comboSaving,
  flashLive,
  flashPrice,
  type Combo,
  type FlashSale,
} from './pricing'

const combo = (over: Partial<Combo> = {}): Combo => ({
  id: 'c1',
  name: 'Eid set',
  slug: 'eid-set',
  on: true,
  items: [
    { productId: 'a', qty: 1 },
    { productId: 'b', qty: 2 },
  ],
  price: 1500,
  ...over,
})
const lines = (a: number, b: number) => [
  { productId: 'a', unitPrice: 1000, quantity: a },
  { productId: 'b', unitPrice: 500, quantity: b },
]

describe('combos (A9)', () => {
  it('takes the saving once per full set of items', () => {
    expect(comboSaving(lines(1, 2), [combo()])).toBe(500)
    expect(comboSaving(lines(2, 5), [combo()])).toBe(1000)
    expect(comboSaving(lines(1, 1), [combo()])).toBe(0)
    expect(comboSaving([{ productId: 'a', unitPrice: 1000, quantity: 1 }], [combo()])).toBe(0)
  })

  it('ignores combos that are off, empty or no cheaper; items count once across combos', () => {
    expect(comboSaving(lines(1, 2), [combo({ on: false })])).toBe(0)
    expect(comboSaving(lines(1, 2), [combo({ items: [] })])).toBe(0)
    expect(comboSaving(lines(1, 2), [combo({ price: 2500 })])).toBe(0)
    const second = combo({ id: 'c2', items: [{ productId: 'a', qty: 1 }], price: 900 })
    expect(comboSaving(lines(1, 2), [combo(), second])).toBe(500)
    expect(comboSaving(lines(2, 2), [combo(), second])).toBe(600)
  })

  it('says how much less a combo costs', () => {
    expect(comboPercent(2000, 1500)).toBe(25)
    expect(comboPercent(1500, 1500)).toBe(0)
  })
})

describe('flash sale (B11)', () => {
  const sale: FlashSale = {
    on: true,
    name: 'Friday',
    startsAt: new Date('2026-12-01T00:00:00Z'),
    endsAt: new Date('2026-12-02T00:00:00Z'),
    cap: 10,
    items: [
      { productId: 'a', price: 700, percent: null },
      { productId: 'b', price: null, percent: 20 },
      { productId: 'c', price: 2000, percent: null },
    ],
  }
  const during = new Date('2026-12-01T12:00:00Z')

  it('runs only inside its window and while on', () => {
    expect(flashLive(sale, during)).toBe(true)
    expect(flashLive(sale, sale.endsAt)).toBe(false)
    expect(flashLive(sale, new Date('2026-11-30T23:59:59Z'))).toBe(false)
    expect(flashLive({ ...sale, on: false }, during)).toBe(false)
    expect(flashLive(null, during)).toBe(false)
  })

  it('prices listed products by price or percent, never above the normal price, until the cap', () => {
    expect(flashPrice(sale, 'a', 1000, during)).toBe(700)
    expect(flashPrice(sale, 'b', 999, during)).toBe(799)
    expect(flashPrice(sale, 'c', 1500, during)).toBe(1500)
    expect(flashPrice(sale, 'z', 1000, during)).toBeNull()
    expect(flashPrice(sale, 'a', 1000, during, 10)).toBeNull()
    expect(flashPrice({ ...sale, cap: null }, 'a', 1000, during, 99)).toBe(700)
    expect(flashPrice(sale, 'a', 1000, sale.endsAt)).toBeNull()
  })
})
