import { describe, expect, it } from 'vitest'
import { canTransition, nextStatuses, stockEffect } from './status'
import { checkoutInput, computeTotals, mergeItems } from './checkout'

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
    })
  })
  it('rejects an invalid BD phone', () => {
    const r = checkoutInput.safeParse({ ...valid, phone: '12345' })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toBe('phone.invalid')
  })
  it('computes totals in poisha and merges duplicate lines', () => {
    expect(computeTotals([{ unitPrice: 34900, quantity: 2 }], 6000)).toEqual({
      subtotal: 69800,
      deliveryCharge: 6000,
      total: 75800,
    })
    expect(
      mergeItems([
        { productId: 'a', quantity: 1 },
        { productId: 'b', quantity: 1 },
        { productId: 'a', quantity: 2 },
      ]),
    ).toEqual([
      { productId: 'a', quantity: 3 },
      { productId: 'b', quantity: 1 },
    ])
  })
})
