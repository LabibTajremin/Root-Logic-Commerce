import { describe, expect, it } from 'vitest'
import { createPlans, entitlementIds } from '@/modules/plans'
import { createEntitlementsRepo } from '@/infrastructure/db/repositories/entitlements-repo'
import { storeEntitlements } from '@/infrastructure/db/schema'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

describe('plans', () => {
  it('merges configured and granted entitlements; locked features stay listed', async () => {
    const db = await createTestDb()
    const store = await seedStore(db)
    const plans = createPlans({ repo: createEntitlementsRepo(db), configured: ['seoPro'] })
    await plans.grant(store, 'removeBranding')
    await plans.grant(store, 'removeBranding')
    await db.insert(storeEntitlements).values({ storeId: store, entitlement: 'legacyThing' })
    expect(await plans.has(store, 'removeBranding')).toBe(true)
    expect(await plans.has(store, 'seoPro')).toBe(true)
    expect(await plans.has(store, 'ga4InAdmin')).toBe(false)
    const f = await plans.features(store)
    expect(f).toHaveLength(entitlementIds.length)
    expect(f.filter((x) => x.unlocked).map((x) => x.id)).toEqual(['removeBranding', 'seoPro'])
    await plans.revoke(store, 'removeBranding')
    expect(await plans.has(store, 'removeBranding')).toBe(false)
    await expect(plans.grant(store, 'everything')).rejects.toThrow('plans.unknown_entitlement')
  })
})
