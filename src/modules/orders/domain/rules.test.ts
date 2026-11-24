import { describe, expect, it } from 'vitest'
import { checkLimits, freeShipping, shopRules } from './rules'

const rule = { minSubtotal: 100000, zoneIds: ['dhaka'], productIds: ['gift'] }

describe('free shipping (C3)', () => {
  it('is free above the subtotal, in a listed zone, or with a listed product', () => {
    expect(freeShipping(rule, { subtotal: 100000, zoneId: 'out', productIds: [] })).toEqual({
      free: true,
      remaining: 0,
    })
    expect(freeShipping(rule, { subtotal: 1000, zoneId: 'dhaka', productIds: [] })).toMatchObject({
      free: true,
    })
    expect(
      freeShipping(rule, { subtotal: 1000, zoneId: 'out', productIds: ['gift'] }),
    ).toMatchObject({ free: true })
    expect(freeShipping(rule, { subtotal: 60000, zoneId: 'out', productIds: ['x'] })).toEqual({
      free: false,
      remaining: 40000,
    })
    expect(
      freeShipping(shopRules.freeShipping, {
        subtotal: 9e9,
        zoneId: 'dhaka',
        productIds: ['gift'],
      }),
    ).toEqual({
      free: false,
      remaining: null,
    })
  })
})

describe('order limits (C7)', () => {
  const lines = [
    { productId: 'a', quantity: 3, min: 2, max: 5 },
    { productId: 'b', quantity: 1, min: null, max: null },
  ]
  it('checks per-product quantities and the order value', () => {
    expect(checkLimits(lines, 50000, { minOrder: 10000, maxOrder: 90000 })).toBeNull()
    expect(checkLimits([{ ...lines[0]!, quantity: 1 }], 50000, shopRules.limits)).toEqual({
      code: 'order.min_qty',
      productId: 'a',
      limit: 2,
    })
    expect(checkLimits([{ ...lines[0]!, quantity: 6 }], 50000, shopRules.limits)).toEqual({
      code: 'order.max_qty',
      productId: 'a',
      limit: 5,
    })
    expect(checkLimits(lines, 5000, { minOrder: 10000, maxOrder: null })).toEqual({
      code: 'order.min_value',
      limit: 10000,
    })
    expect(checkLimits(lines, 99000, { minOrder: null, maxOrder: 90000 })).toEqual({
      code: 'order.max_value',
      limit: 90000,
    })
  })
})
