import { and, asc, count, eq, inArray, isNull, sum } from 'drizzle-orm'
import type { MediaRepo, MediaRow } from '@/modules/media'
import type { Db } from '../client'
import { media, productMedia, products } from '../schema'

const cols = {
  id: media.id,
  kind: media.kind,
  ref: media.ref,
  width: media.width,
  bytes: media.bytes,
  dominantColor: media.dominantColor,
}
// kind is only ever written as 'upload' | 'gdrive' and dominant_color is always set;
// the DB columns are just looser.
const row = (
  r: Omit<MediaRow, 'kind' | 'dominantColor'> & { kind: string; dominantColor: string | null },
) => r as MediaRow

export const createMediaRepo = (db: Db): MediaRepo => ({
  async usedBytes(storeId) {
    const [r] = await db
      .select({ n: sum(media.bytes) })
      .from(media)
      .where(eq(media.storeId, storeId))
    return Number(r!.n ?? 0)
  },
  async insert(storeId, m) {
    const [r] = await db
      .insert(media)
      .values({ storeId, ...m })
      .returning(cols)
    return row(r!)
  },
  async get(storeId, id) {
    const [r] = await db
      .select(cols)
      .from(media)
      .where(and(eq(media.storeId, storeId), eq(media.id, id)))
    return r ? row(r) : null
  },
  async attach(storeId, productId, mediaId) {
    const [p] = await db
      .select({ id: products.id })
      .from(products)
      .where(and(eq(products.id, productId), eq(products.storeId, storeId)))
    const [m] = await db
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.id, mediaId), eq(media.storeId, storeId)))
    if (!p || !m) return false
    const [c] = await db
      .select({ n: count() })
      .from(productMedia)
      .where(eq(productMedia.productId, productId))
    await db
      .insert(productMedia)
      .values({ productId, mediaId, sortOrder: c!.n })
      .onConflictDoNothing()
    await db.update(media).set({ orphanedAt: null }).where(eq(media.id, mediaId))
    return true
  },
  async detach(storeId, productId, mediaId) {
    await db.transaction(async (tx) => {
      await tx
        .delete(productMedia)
        .where(and(eq(productMedia.productId, productId), eq(productMedia.mediaId, mediaId)))
      await tx
        .update(media)
        .set({ orphanedAt: new Date() })
        .where(and(eq(media.id, mediaId), eq(media.storeId, storeId), isNull(media.orphanedAt)))
    })
  },
  async forProducts(storeId, productIds) {
    if (productIds.length === 0) return []
    const rs = await db
      .select({ productId: productMedia.productId, ...cols })
      .from(productMedia)
      .innerJoin(media, eq(media.id, productMedia.mediaId))
      .where(and(eq(media.storeId, storeId), inArray(productMedia.productId, productIds)))
      .orderBy(asc(productMedia.sortOrder))
    return rs.map(({ productId, ...m }) => ({ productId, media: row(m) }))
  },
})
