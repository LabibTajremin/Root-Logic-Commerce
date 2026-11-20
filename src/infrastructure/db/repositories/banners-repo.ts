import { and, asc, eq, sql } from 'drizzle-orm'
import type { Banner, BannerData, BannersRepo } from '@/modules/promotions'
import type { Db } from '../client'
import { banners } from '../schema'

const cols = {
  id: banners.id,
  data: banners.data,
  active: banners.active,
  sortOrder: banners.sortOrder,
}
// data was validated (bannerData) before every write.
const row = (r: { id: string; data: unknown; active: boolean; sortOrder: number }) => r as Banner

export const createBannersRepo = (db: Db): BannersRepo => ({
  async list(storeId) {
    return (
      await db
        .select(cols)
        .from(banners)
        .where(eq(banners.storeId, storeId))
        .orderBy(asc(banners.sortOrder), asc(banners.createdAt))
    ).map(row)
  },
  async insert(storeId, data: BannerData) {
    const [r] = await db
      .insert(banners)
      .values({
        storeId,
        kind: data.kind,
        data,
        sortOrder: sql`(select coalesce(max(${banners.sortOrder}) + 1, 0) from ${banners} where ${banners.storeId} = ${storeId})`,
      })
      .returning(cols)
    return row(r!)
  },
  async setActive(storeId, id, active) {
    const r = await db
      .update(banners)
      .set({ active })
      .where(and(eq(banners.storeId, storeId), eq(banners.id, id)))
      .returning({ id: banners.id })
    return r.length > 0
  },
  async remove(storeId, id) {
    await db.delete(banners).where(and(eq(banners.storeId, storeId), eq(banners.id, id)))
  },
  async setOrder(storeId, ids) {
    await db.transaction(async (tx) => {
      for (const [sortOrder, id] of ids.entries())
        await tx
          .update(banners)
          .set({ sortOrder })
          .where(and(eq(banners.storeId, storeId), eq(banners.id, id)))
    })
  },
})
