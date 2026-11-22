import { and, count, desc, eq, gte, ilike, lt, lte, type SQL } from 'drizzle-orm'
import type { ActivityFilter, ActivityRepo } from '@/modules/activity'
import type { Db } from '../client'
import { activityLog as a } from '../schema'

const where = (storeId: string, f: ActivityFilter, withAction: boolean) =>
  and(
    eq(a.storeId, storeId),
    ...([
      withAction && f.action ? eq(a.action, f.action) : undefined,
      f.actorId ? eq(a.actorId, f.actorId) : undefined,
      f.q ? ilike(a.action, `%${f.q}%`) : undefined,
      f.from ? gte(a.createdAt, f.from) : undefined,
      f.to ? lte(a.createdAt, f.to) : undefined,
    ].filter(Boolean) as SQL[]),
  )

const cols = {
  id: a.id,
  action: a.action,
  actorId: a.actorId,
  actorIp: a.actorIp,
  before: a.before,
  after: a.after,
  undoneAt: a.undoneAt,
  createdAt: a.createdAt,
}

export const createActivityRepo = (db: Db): ActivityRepo => ({
  insert: async (storeId, e) => {
    await db.insert(a).values({ storeId, ...e })
  },
  list: (storeId, f, limit) =>
    db
      .select(cols)
      .from(a)
      .where(where(storeId, f, true))
      .orderBy(desc(a.createdAt))
      .limit(limit),
  counts: (storeId, f) =>
    db
      .select({ action: a.action, n: count() })
      .from(a)
      .where(where(storeId, f, false))
      .groupBy(a.action)
      .orderBy(a.action),
  get: async (storeId, id) =>
    (
      await db
        .select(cols)
        .from(a)
        .where(and(eq(a.storeId, storeId), eq(a.id, id)))
    )[0] ?? null,
  markUndone: async (storeId, id, at) => {
    await db
      .update(a)
      .set({ undoneAt: at })
      .where(and(eq(a.storeId, storeId), eq(a.id, id)))
  },
  purge: async (olderThan) => {
    await db.delete(a).where(lt(a.createdAt, olderThan))
  },
})
