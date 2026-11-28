import { and, desc, eq, getTableColumns, gte, lt } from 'drizzle-orm'
import type { DraftsRepo } from '@/modules/orders'
import type { Db } from '../client'
import { checkoutDrafts as t } from '../schema'

const { storeId: _s, ...cols } = getTableColumns(t)

export const createDraftsRepo = (db: Db): DraftsRepo => ({
  async upsert(storeId, d) {
    await db
      .insert(t)
      .values({ ...d, storeId })
      .onConflictDoUpdate({
        target: [t.storeId, t.phone],
        set: { ...d, updatedAt: new Date() },
      })
  },
  list: (storeId, since) =>
    db
      .select(cols)
      .from(t)
      .where(and(eq(t.storeId, storeId), gte(t.updatedAt, since)))
      .orderBy(desc(t.updatedAt))
      .limit(200),
  get: async (storeId, id, since) =>
    (
      await db
        .select(cols)
        .from(t)
        .where(and(eq(t.storeId, storeId), eq(t.id, id), gte(t.updatedAt, since)))
    )[0] ?? null,
  async remove(storeId, by) {
    await db
      .delete(t)
      .where(and(eq(t.storeId, storeId), 'id' in by ? eq(t.id, by.id) : eq(t.phone, by.phone)))
  },
  async purge(before) {
    await db.delete(t).where(lt(t.updatedAt, before))
  },
})
