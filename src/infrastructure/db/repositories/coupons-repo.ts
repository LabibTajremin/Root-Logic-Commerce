import { and, asc, count, eq, getTableColumns, ne } from 'drizzle-orm'
import type { CouponsRepo } from '@/modules/coupons'
import type { Db } from '../client'
import { couponRedemptions, coupons } from '../schema'

const { storeId: _s, createdAt: _c, ...cols } = getTableColumns(coupons)

export const createCouponsRepo = (db: Db): CouponsRepo => {
  const codeTaken = async (storeId: string, code: string, exceptId?: string) =>
    (
      await db
        .select({ id: coupons.id })
        .from(coupons)
        .where(
          and(
            eq(coupons.storeId, storeId),
            eq(coupons.code, code),
            ...(exceptId ? [ne(coupons.id, exceptId)] : []),
          ),
        )
    ).length > 0
  return {
    list: (storeId) =>
      db.select(cols).from(coupons).where(eq(coupons.storeId, storeId)).orderBy(asc(coupons.code)),
    insert: async (storeId, c) =>
      (await codeTaken(storeId, c.code))
        ? null
        : (
            await db
              .insert(coupons)
              .values({ ...c, storeId })
              .returning(cols)
          )[0]!,
    update: async (storeId, id, c) => {
      if (await codeTaken(storeId, c.code, id)) return null
      const rows = await db
        .update(coupons)
        .set(c)
        .where(and(eq(coupons.storeId, storeId), eq(coupons.id, id)))
        .returning({ id: coupons.id })
      return rows.length > 0
    },
    findByCode: async (storeId, code) =>
      (
        await db
          .select(cols)
          .from(coupons)
          .where(and(eq(coupons.storeId, storeId), eq(coupons.code, code)))
      )[0] ?? null,
    usedByPhone: async (couponId, phone) =>
      (
        await db
          .select({ n: count() })
          .from(couponRedemptions)
          .where(and(eq(couponRedemptions.couponId, couponId), eq(couponRedemptions.phone, phone)))
      )[0]!.n,
  }
}
