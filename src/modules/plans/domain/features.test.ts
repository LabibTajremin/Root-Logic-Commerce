import { describe, expect, it } from 'vitest'
import { featureCatalog, featureView, isFeature } from './features'
import { entitlementIds } from './entitlements'

describe('feature catalogue (J5)', () => {
  it('every paid feature is gated by an entitlement of the same name', () => {
    for (const f of featureCatalog) {
      if (f.paid) expect(entitlementIds).toContain(f.id)
    }
    expect(isFeature('reels')).toBe(true)
    expect(isFeature('nope')).toBe(false)
  })

  it('stored choice wins over the default; a locked feature is never active', () => {
    const view = featureView(new Map([['coupons', false]]), new Set(['reels']))
    const by = Object.fromEntries(view.map((v) => [v.id, v]))
    expect(by.coupons).toMatchObject({ enabled: false, locked: false, active: false })
    expect(by.incompleteOrders).toMatchObject({ enabled: true, locked: false, active: true })
    expect(by.reels).toMatchObject({ locked: false })
    expect(by.pos).toMatchObject({ enabled: false, locked: true, active: false })
    expect(view).toHaveLength(featureCatalog.length)
  })
})
