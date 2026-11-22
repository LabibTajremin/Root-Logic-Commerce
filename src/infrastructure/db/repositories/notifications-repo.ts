import { and, count, desc, eq, isNull } from 'drizzle-orm'
import type { NoticesRepo } from '@/modules/notifications'
import type { Db } from '../client'
import { notifications } from '../schema'

export const createNotificationsRepo = (db: Db): NoticesRepo => ({
  insert: async (storeId, n) => {
    await db.insert(notifications).values({ storeId, ...n })
  },
  list: (storeId, limit) =>
    db
      .select({
        id: notifications.id,
        kind: notifications.kind,
        ref: notifications.ref,
        data: notifications.data,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.storeId, storeId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit),
  unread: async (storeId) =>
    (
      await db
        .select({ n: count() })
        .from(notifications)
        .where(and(eq(notifications.storeId, storeId), isNull(notifications.readAt)))
    )[0]!.n,
  markRead: async (storeId, id) => {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notifications.storeId, storeId),
          isNull(notifications.readAt),
          ...(id ? [eq(notifications.id, id)] : []),
        ),
      )
  },
})
