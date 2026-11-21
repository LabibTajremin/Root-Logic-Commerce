import { and, between, desc, eq, gte, lt, notInArray, sql, sum } from 'drizzle-orm'
import type { Counters, DayStats, InsightsRepo } from '@/modules/insights'
import type { Db } from '../client'
import { dailyStats, orderItems, orders, pageViews } from '../schema'

const COLS = [
  'visitors',
  'pageViews',
  'ordersPlaced',
  'ordersConfirmed',
  'ordersDelivered',
  'ordersCancelled',
  'ordersReturned',
  'revenue',
  'cost',
] as const

// One upsert per change: daily_stats holds the counts, so the dashboard never scans raw events.
const upsert = (db: Db, storeId: string, date: string, d: Counters) =>
  db
    .insert(dailyStats)
    .values({ storeId, date, ...d })
    .onConflictDoUpdate({
      target: [dailyStats.storeId, dailyStats.date],
      set: Object.fromEntries(
        Object.keys(d).map((k) => {
          const col = dailyStats[k as (typeof COLS)[number]]
          const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
          return [k, sql`${col} + excluded.${sql.identifier(snake)}`]
        }),
      ),
    })

export const createInsightsRepo = (db: Db): InsightsRepo => ({
  async recordView(storeId, date, visitor, path) {
    await db.transaction(async (tx) => {
      // The hash already includes the day, so "seen before" means "seen today".
      const [seen] = await tx
        .select({ id: pageViews.id })
        .from(pageViews)
        .where(and(eq(pageViews.storeId, storeId), eq(pageViews.visitorHash, visitor)))
        .limit(1)
      await tx.insert(pageViews).values({ storeId, visitorHash: visitor, path: path.slice(0, 300) })
      await upsert(tx as unknown as Db, storeId, date, { pageViews: 1, visitors: seen ? 0 : 1 })
    })
  },
  async bump(storeId, date, d) {
    await upsert(db, storeId, date, d)
  },
  async days(storeId, from, to) {
    const rows = await db
      .select({ date: dailyStats.date, ...Object.fromEntries(COLS.map((c) => [c, dailyStats[c]])) })
      .from(dailyStats)
      .where(and(eq(dailyStats.storeId, storeId), between(dailyStats.date, from, to)))
      .orderBy(dailyStats.date)
    return rows as unknown as DayStats[]
  },
  async topProducts(storeId, from, to, limit) {
    const quantity = sum(orderItems.quantity).mapWith(Number)
    return db
      .select({
        name: orderItems.name,
        quantity,
        revenue: sum(sql`${orderItems.unitPrice} * ${orderItems.quantity}`).mapWith(Number),
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(
        and(
          eq(orders.storeId, storeId),
          gte(orders.createdAt, from),
          lt(orders.createdAt, to),
          notInArray(orders.status, ['CANCELLED', 'RETURNED']),
        ),
      )
      .groupBy(orderItems.name)
      .orderBy(desc(quantity), orderItems.name)
      .limit(limit)
  },
  async purgeViews(before) {
    await db.delete(pageViews).where(lt(pageViews.createdAt, before))
  },
})
