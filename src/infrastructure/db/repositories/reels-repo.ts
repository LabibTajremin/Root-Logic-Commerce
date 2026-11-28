import { and, asc, eq } from 'drizzle-orm'
import type { ReelsRepo } from '@/modules/promotions'
import type { Db } from '../client'
import { reels } from '../schema'

const cols = {
  id: reels.id,
  videoId: reels.videoId,
  url: reels.url,
  coverId: reels.coverId,
  caption: reels.caption,
  productIds: reels.productIds,
  sortOrder: reels.sortOrder,
}

export const createReelsRepo = (db: Db): ReelsRepo => ({
  list: (storeId) =>
    db
      .select(cols)
      .from(reels)
      .where(eq(reels.storeId, storeId))
      .orderBy(asc(reels.sortOrder), asc(reels.createdAt)),
  insert: async (storeId, reel) => {
    // New reels go last.
    const n = await db.$count(reels, eq(reels.storeId, storeId))
    const [row] = await db
      .insert(reels)
      .values({ storeId, ...reel, sortOrder: n })
      .returning({ id: reels.id })
    return row!.id
  },
  remove: async (storeId, id) => {
    await db.delete(reels).where(and(eq(reels.storeId, storeId), eq(reels.id, id)))
  },
  setOrder: async (storeId, ids) => {
    await db.transaction(async (tx) => {
      for (const [i, id] of ids.entries())
        await tx
          .update(reels)
          .set({ sortOrder: i })
          .where(and(eq(reels.storeId, storeId), eq(reels.id, id)))
    })
  },
})
