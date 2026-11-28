import { and, desc, eq, type SQL } from 'drizzle-orm'
import type { ReviewsRepo } from '@/modules/reviews'
import type { Db } from '../client'
import { reviews, reviewScreenshots } from '../schema'

const cols = {
  id: reviews.id,
  productId: reviews.productId,
  orderId: reviews.orderId,
  name: reviews.name,
  rating: reviews.rating,
  body: reviews.body,
  status: reviews.status,
  reply: reviews.reply,
  createdAt: reviews.createdAt,
}

const shotCols = {
  id: reviewScreenshots.id,
  mediaId: reviewScreenshots.mediaId,
  caption: reviewScreenshots.caption,
}

export const createReviewsRepo = (db: Db): ReviewsRepo => ({
  listShots: (storeId) =>
    db
      .select(shotCols)
      .from(reviewScreenshots)
      .where(eq(reviewScreenshots.storeId, storeId))
      .orderBy(desc(reviewScreenshots.createdAt)),
  addShot: async (storeId, shot) =>
    (
      await db
        .insert(reviewScreenshots)
        .values({ ...shot, storeId })
        .returning(shotCols)
    )[0]!,
  removeShot: async (storeId, id) => {
    await db
      .delete(reviewScreenshots)
      .where(and(eq(reviewScreenshots.storeId, storeId), eq(reviewScreenshots.id, id)))
  },
  insert: async (storeId, r) =>
    (
      await db
        .insert(reviews)
        .values({ ...r, storeId })
        .onConflictDoNothing()
        .returning(cols)
    )[0] ?? null,
  list: (storeId, f) => {
    const where: SQL[] = [eq(reviews.storeId, storeId)]
    if (f.productId) where.push(eq(reviews.productId, f.productId))
    if (f.status) where.push(eq(reviews.status, f.status))
    return db
      .select(cols)
      .from(reviews)
      .where(and(...where))
      .orderBy(desc(reviews.createdAt))
  },
  update: async (storeId, id, patch) =>
    (
      await db
        .update(reviews)
        .set(patch)
        .where(and(eq(reviews.storeId, storeId), eq(reviews.id, id)))
        .returning({ id: reviews.id })
    ).length > 0,
})
