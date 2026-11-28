import { describe, expect, it } from 'vitest'
import { createFeatures, createPlans } from '@/modules/plans'
import { createEntitlementsRepo } from '@/infrastructure/db/repositories/entitlements-repo'
import { createFeaturesRepo } from '@/infrastructure/db/repositories/features-repo'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

describe('feature toggles (J5)', () => {
  it('free modules default on, paid ones stay locked until granted, choices persist per store', async () => {
    const db = await createTestDb()
    const store = await seedStore(db)
    const plans = createPlans({ repo: createEntitlementsRepo(db), configured: [] })
    const features = createFeatures({ repo: createFeaturesRepo(db), plans })

    expect(await features.isOn(store, 'coupons')).toBe(true)
    await features.setEnabled(store, 'coupons', false)
    await features.setEnabled(store, 'coupons', false)
    expect(await features.isOn(store, 'coupons')).toBe(false)

    await expect(features.setEnabled(store, 'reels', true)).rejects.toThrow('features.locked')
    await features.setEnabled(store, 'reels', false)
    await plans.grant(store, 'reels')
    expect(await features.isOn(store, 'reels')).toBe(false)
    await features.setEnabled(store, 'reels', true)
    expect(await features.isOn(store, 'reels')).toBe(true)
    await plans.revoke(store, 'reels')
    expect(await features.isOn(store, 'reels')).toBe(false)

    await expect(features.setEnabled(store, 'teleport', true)).rejects.toThrow('features.unknown')
    const other = await seedStore(db, 'other')
    expect(await features.isOn(other, 'coupons')).toBe(true)
  })
})
