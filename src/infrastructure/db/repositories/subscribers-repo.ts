import { desc, eq } from 'drizzle-orm'
import type { SubscribersRepo } from '@/modules/newsletter'
import type { Db } from '../client'
import { subscribers } from '../schema'

export const createSubscribersRepo = (db: Db): SubscribersRepo => ({
  add: async (storeId, s) => {
    await db
      .insert(subscribers)
      .values({ storeId, ...s })
      .onConflictDoNothing()
  },
  list: (storeId) =>
    db
      .select({
        contact: subscribers.contact,
        kind: subscribers.kind,
        createdAt: subscribers.createdAt,
      })
      .from(subscribers)
      .where(eq(subscribers.storeId, storeId))
      .orderBy(desc(subscribers.createdAt)),
})
