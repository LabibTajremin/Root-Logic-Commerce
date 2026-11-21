import { and, count, desc, eq, gte, sql } from 'drizzle-orm'
import type { OtpRepo } from '@/modules/messages'
import type { Db } from '../client'
import { otpCodes } from '../schema'

export const createOtpRepo = (db: Db): OtpRepo => {
  const of = (storeId: string, target: string) =>
    and(eq(otpCodes.storeId, storeId), eq(otpCodes.target, target))!
  return {
    async countSince(storeId, target, since) {
      const [r] = await db
        .select({ n: count() })
        .from(otpCodes)
        .where(and(of(storeId, target), gte(otpCodes.createdAt, since)))
      return r!.n
    },
    async insert(storeId, row) {
      await db.insert(otpCodes).values({ storeId, ...row })
    },
    async latest(storeId, target) {
      const [r] = await db
        .select({
          id: otpCodes.id,
          target: otpCodes.target,
          codeHash: otpCodes.codeHash,
          attempts: otpCodes.attempts,
          expiresAt: otpCodes.expiresAt,
          consumedAt: otpCodes.consumedAt,
        })
        .from(otpCodes)
        .where(of(storeId, target))
        .orderBy(desc(otpCodes.createdAt))
        .limit(1)
      return r ?? null
    },
    async bumpAttempts(id) {
      await db
        .update(otpCodes)
        .set({ attempts: sql`${otpCodes.attempts} + 1` })
        .where(eq(otpCodes.id, id))
    },
    async consume(id) {
      await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, id))
    },
  }
}
