import { describe, expect, it } from 'vitest'
import { applyCoupon, couponInput, type Coupon } from './coupons'

const now = new Date('2026-11-23T10:00:00Z')
const base: Coupon = {
  id: 'c1',
  code: 'EID10',
  kind: 'percent',
  value: 10,
  minSubtotal: 0,
  productIds: [],
  categoryIds: [],
  startsAt: null,
  endsAt: null,
  totalLimit: null,
  perPhoneLimit: null,
  autoApply: false,
  active: true,
  used: 0,
}
const lines = [
  { productId: 'p1', categoryId: 'c-tea', amount: 30000 },
  { productId: 'p2', categoryId: null, amount: 20000 },
]
const at = (c: Partial<Coupon>, usedByPhone = 0, delivery = 6000) =>
  applyCoupon({ ...base, ...c }, { lines, delivery, now, usedByPhone })

describe('coupons (C2)', () => {
  it('takes a percent or a fixed amount off, never more than the goods', () => {
    expect(at({})).toEqual({ ok: true, discount: 5000, freeShipping: false })
    expect(at({ kind: 'fixed', value: 7000 })).toEqual({
      ok: true,
      discount: 7000,
      freeShipping: false,
    })
    expect(at({ kind: 'fixed', value: 999999 })).toMatchObject({ discount: 50000 })
    expect(at({ kind: 'free_shipping', value: 0 })).toEqual({
      ok: true,
      discount: 6000,
      freeShipping: true,
    })
  })

  it('applies only to the scoped products or categories', () => {
    expect(at({ productIds: ['p2'] })).toMatchObject({ discount: 2000 })
    expect(at({ categoryIds: ['c-tea'] })).toMatchObject({ discount: 3000 })
    expect(at({ productIds: ['nope'] })).toEqual({ ok: false, reason: 'coupon.not_applicable' })
  })

  it('refuses inactive, early, expired, below-minimum and used-up codes', () => {
    expect(at({ active: false })).toEqual({ ok: false, reason: 'coupon.invalid' })
    expect(at({ startsAt: new Date('2026-12-01') })).toEqual({
      ok: false,
      reason: 'coupon.not_started',
    })
    expect(at({ endsAt: new Date('2026-11-01') })).toEqual({ ok: false, reason: 'coupon.expired' })
    expect(at({ minSubtotal: 60000 })).toEqual({ ok: false, reason: 'coupon.min_subtotal' })
    expect(at({ totalLimit: 3, used: 3 })).toEqual({ ok: false, reason: 'coupon.used_up' })
    expect(at({ perPhoneLimit: 1 }, 1)).toEqual({ ok: false, reason: 'coupon.phone_limit' })
    expect(at({ totalLimit: 3, used: 2, perPhoneLimit: 2 }, 1)).toMatchObject({ ok: true })
  })

  it('validates the owner’s form', () => {
    const ok = { code: ' eid10 ', kind: 'percent', value: 10 }
    expect(couponInput.parse(ok)).toMatchObject({
      code: 'EID10',
      minSubtotal: 0,
      active: true,
      autoApply: false,
    })
    expect(couponInput.safeParse({ ...ok, value: 0 }).success).toBe(false)
    expect(couponInput.safeParse({ ...ok, value: 101 }).success).toBe(false)
    expect(couponInput.safeParse({ ...ok, kind: 'fixed', value: 5000 }).success).toBe(true)
    expect(couponInput.safeParse({ ...ok, kind: 'free_shipping', value: 0 }).success).toBe(true)
    expect(couponInput.safeParse({ ...ok, code: 'bad code!' }).success).toBe(false)
    expect(
      couponInput.safeParse({
        ...ok,
        startsAt: new Date('2026-12-02'),
        endsAt: new Date('2026-12-01'),
      }).success,
    ).toBe(false)
  })
})
