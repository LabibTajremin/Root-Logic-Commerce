import { eq } from 'drizzle-orm'
import type { FeaturesRepo } from '@/modules/plans'
import type { Db } from '../client'
import { storeFeatures } from '../schema'

export const createFeaturesRepo = (db: Db): FeaturesRepo => ({
  list: (storeId) =>
    db
      .select({ feature: storeFeatures.feature, enabled: storeFeatures.enabled })
      .from(storeFeatures)
      .where(eq(storeFeatures.storeId, storeId)),
  set: async (storeId, feature, enabled) => {
    await db
      .insert(storeFeatures)
      .values({ storeId, feature, enabled })
      .onConflictDoUpdate({
        target: [storeFeatures.storeId, storeFeatures.feature],
        set: { enabled, updatedAt: new Date() },
      })
  },
})
