import { describe, expect, it } from 'vitest'
import { canTransition, nextStatuses, stockEffect, undelivered } from './status'
import { checkoutInput, computeTotals, lineName, mergeItems } from './checkout'

describe('status flow', () => {
  it('follows PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED', () => {
    expect(canTransition('PENDING', 'CONFIRMED')).toBe(true)
    expect(canTransition('SHIPPED', 'DELIVERED')).toBe(true)
    expect(canTransition('PENDING', 'SHIPPED')).toBe(false)
  })
  it('cancels from any pre-delivery state and returns only after delivery', () => {
    for (const s of ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED'] as const)
      expect(canTransition(s, 'CANCELLED')).toBe(true)
    expect(canTransition('DELIVERED', 'CANCELLED')).toBe(false)
    expect(nextStatuses('DELIVERED')).toEqual(['RETURNED'])
    expect(nextStatuses('CANCELLED')).toEqual([])
  })
  it('deducts stock on confirm and restocks only what was deducted', () => {
    expect(stockEffect('CONFIRMED', false)).toBe('deduct')
    expect(stockEffect('CONFIRMED', true)).toBeNull()
    expect(stockEffect('CANCELLED', true)).toBe('restock')
    expect(stockEffect('RETURNED', true)).toBe('restock')
    expect(stockEffect('CANCELLED', false)).toBeNull()
    expect(stockEffect('SHIPPED', true)).toBeNull()
    // C13: a courier return restocks only once received; partial delivery restocks the rest.
    expect(stockEffect('RETURNING', true)).toBeNull()
    expect(stockEffect('RETURN_MISSING', true)).toBeNull()
    expect(stockEffect('RETURN_RECEIVED', true)).toBe('restock')
    expect(stockEffect('PARTIAL_DELIVERED', true)).toBe('partial')
    expect(stockEffect('PARTIAL_DELIVERED', false)).toBeNull()
  })
  it('holds, schedules and brings courier returns back (C13)', () => {
    expect(nextStatuses('PENDING')).toEqual(['CONFIRMED', 'ON_HOLD', 'SCHEDULED', 'CANCELLED'])
    expect(canTransition('ON_HOLD', 'PENDING')).toBe(true)
    expect(canTransition('SCHEDULED', 'PENDING')).toBe(true)
    expect(canTransition('SHIPPED', 'RETURNING')).toBe(true)
    expect(canTransition('RETURNING', 'RETURN_MISSING')).toBe(true)
    expect(canTransition('RETURN_MISSING', 'RETURN_RECEIVED')).toBe(true)
    expect(canTransition('RETURNING', 'DELIVERED')).toBe(false)
  })
  it('works out the undelivered lines of a partial delivery', () => {
    const items = [
      { id: 'a', quantity: 2 },
      { id: 'b', quantity: 1 },
    ]
    expect(undelivered(items, { a: 2 })).toEqual([{ itemId: 'b', quantity: 1 }])
    expect(undelivered(items, { a: 1, b: 1 })).toEqual([{ itemId: 'a', quantity: 1 }])
    const bad: Record<string, number>[] = [{}, { a: 2, b: 1 }, { a: 3 }, { a: -1 }, { a: 0.5 }]
    for (const b of bad) expect(() => undelivered(items, b)).toThrow('order.partial_invalid')
  })
})

describe('checkout', () => {
  const valid = {
    name: 'Rahima',
    phone: '+880 1712-345678',
    address: 'House 12, Road 4',
    area: 'Mirpur',
    district: 'Dhaka',
    zoneId: 'dhaka',
    items: [{ productId: '00000000-0000-4000-8000-000000000001', quantity: 2 }],
  }
  it('normalizes the phone and applies defaults', () => {
    expect(checkoutInput.parse(valid)).toMatchObject({
      phone: '01712345678',
      paymentMethod: 'COD',
      note: null,
      altPhone: null,
      preferredTime: 'any',
      giftWrap: false,
      location: null,
    })
    // C5: a GPS point must be a real coordinate.
    expect(
      checkoutInput.safeParse({ ...valid, location: { lat: 99, lng: 0, accuracy: 5 } }).success,
    ).toBe(false)
    // C6: a second phone is normalized like the first; a bad one is refused.
    expect(checkoutInput.parse({ ...valid, altPhone: '+880 1812-345678' }).altPhone).toBe(
      '01812345678',
    )
    expect(checkoutInput.parse({ ...valid, altPhone: '' }).altPhone).toBeNull()
    expect(checkoutInput.safeParse({ ...valid, altPhone: '123' }).success).toBe(false)
    expect(checkoutInput.safeParse({ ...valid, preferredTime: 'midnight' }).success).toBe(false)
    // C2: the code box is trimmed and upper-cased; empty means no code.
    expect(checkoutInput.parse({ ...valid, couponCode: ' eid10 ' }).couponCode).toBe('EID10')
    expect(checkoutInput.parse({ ...valid, couponCode: '' }).couponCode).toBeNull()
  })
  it('rejects an invalid BD phone', () => {
    const r = checkoutInput.safeParse({ ...valid, phone: '12345' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toBe('phone.invalid')
  })
  it('computes totals in poisha and merges duplicate lines', () => {
    expect(computeTotals([{ unitPrice: 34900, quantity: 2 }], 6000, 800)).toEqual({
      subtotal: 69800,
      deliveryCharge: 6000,
      discount: 800,
      total: 75000,
    })
    expect(
      mergeItems([
        { productId: 'a', variantId: null, quantity: 1 },
        { productId: 'b', variantId: 'm', quantity: 1 },
        { productId: 'a', variantId: null, quantity: 2 },
        { productId: 'b', variantId: 'l', quantity: 1 },
      ]),
    ).toEqual([
      { productId: 'a', variantId: null, quantity: 3 },
      { productId: 'b', variantId: 'm', quantity: 1 },
      { productId: 'b', variantId: 'l', quantity: 1 },
    ])
  })

  it('names a variant line with its label', () => {
    expect(lineName({ name: 'Kurta', variantLabel: 'M / Red' })).toBe('Kurta (M / Red)')
    expect(lineName({ name: 'Kurta', variantLabel: null })).toBe('Kurta')
  })
})
