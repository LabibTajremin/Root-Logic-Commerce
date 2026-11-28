import { and, eq } from 'drizzle-orm'
import type { EntitlementsRepo } from '@/modules/plans'
import type { Db } from '../client'
import { storeEntitlements } from '../schema'

export const createEntitlementsRepo = (db: Db): EntitlementsRepo => ({
  list: async (storeId) =>
    (
      await db
        .select({ e: storeEntitlements.entitlement })
        .from(storeEntitlements)
        .where(eq(storeEntitlements.storeId, storeId))
    ).map((r) => r.e),
  grant: async (storeId, entitlement) => {
    await db.insert(storeEntitlements).values({ storeId, entitlement }).onConflictDoNothing()
  },
  revoke: async (storeId, entitlement) => {
    await db
      .delete(storeEntitlements)
      .where(
        and(eq(storeEntitlements.storeId, storeId), eq(storeEntitlements.entitlement, entitlement)),
      )
  },
})
