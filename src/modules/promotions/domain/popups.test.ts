import { describe, expect, it } from 'vitest'
import { popupDue, popupFits } from './popup-rules'
import { popupSchema } from './popups'

const where = (o: Partial<Parameters<typeof popupFits>[0]> = {}) => ({
  pages: 'all' as const,
  device: 'all' as const,
  everyDays: 1,
  ...o,
})

describe('popups (B8)', () => {
  it('validates popups; a product promo needs its product', () => {
    const p = popupSchema.parse({
      id: '00000000-0000-4000-8000-000000000001',
      kind: 'offer',
      title: 'Eid',
    })
    expect(p).toMatchObject({ on: true, pages: 'all', trigger: 'delay', delay: 5, everyDays: 1 })
    expect(popupSchema.safeParse({ ...p, kind: 'product' }).success).toBe(false)
    expect(popupSchema.safeParse({ ...p, href: 'javascript:alert(1)' }).success).toBe(false)
  })

  it('fits pages and screens', () => {
    expect(popupFits(where(), '/c/tea', true)).toBe(true)
    expect(popupFits(where({ pages: 'home' }), '/', false)).toBe(true)
    expect(popupFits(where({ pages: 'home' }), '/search', false)).toBe(false)
    expect(popupFits(where({ pages: 'product' }), '/p/tea', false)).toBe(true)
    expect(popupFits(where({ pages: 'checkout' }), '/checkout', false)).toBe(true)
    expect(popupFits(where({ pages: 'checkout' }), '/p/tea', false)).toBe(false)
    expect(popupFits(where({ device: 'mobile' }), '/', true)).toBe(true)
    expect(popupFits(where({ device: 'desktop' }), '/', true)).toBe(false)
  })

  it('shows once per N days', () => {
    const day = 86_400_000
    expect(popupDue(1, null, 5 * day)).toBe(true)
    expect(popupDue(1, 4.5 * day, 5 * day)).toBe(false)
    expect(popupDue(1, 4 * day, 5 * day)).toBe(true)
    expect(popupDue(0, 5 * day, 5 * day)).toBe(true)
  })
})
