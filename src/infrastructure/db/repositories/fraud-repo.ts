import { and, count, desc, eq, gte, inArray, ne, or, sql } from 'drizzle-orm'
import type { FraudRepo } from '@/modules/fraud'
import { lostStatuses, type OrderStatus } from '@/modules/orders'
import type { Db } from '../client'
import { blocks, fraudAttempts, orderItems, orders } from '../schema'

export const createFraudRepo = (db: Db): FraudRepo => ({
  async addBlock(storeId, b) {
    await db
      .insert(blocks)
      .values({ ...b, storeId })
      .onConflictDoNothing()
  },
  async removeBlock(storeId, id) {
    await db.delete(blocks).where(and(eq(blocks.storeId, storeId), eq(blocks.id, id)))
  },
  listBlocks: (storeId) =>
    db
      .select({
        id: blocks.id,
        kind: blocks.kind,
        value: blocks.value,
        note: blocks.note,
        createdAt: blocks.createdAt,
      })
      .from(blocks)
      .where(eq(blocks.storeId, storeId))
      .orderBy(desc(blocks.createdAt)),
  isBlocked: async (storeId, c) =>
    (
      await db
        .select({ id: blocks.id })
        .from(blocks)
        .where(
          and(
            eq(blocks.storeId, storeId),
            or(
              and(eq(blocks.kind, 'phone'), eq(blocks.value, c.phone)),
              and(eq(blocks.kind, 'ip'), eq(blocks.value, c.ip)),
              and(eq(blocks.kind, 'device'), eq(blocks.value, c.deviceId)),
            ),
          ),
        )
        .limit(1)
    ).length > 0,
  async recentOrders(storeId, c, since) {
    const [r] = await db
      .select({
        phone: sql<number>`count(*) filter (where ${orders.shipPhone} = ${c.phone})`.mapWith(
          Number,
        ),
        ip: sql<number>`count(*) filter (where ${orders.clientIp} = ${c.ip})`.mapWith(Number),
        device: sql<number>`count(*) filter (where ${orders.deviceId} = ${c.deviceId})`.mapWith(
          Number,
        ),
      })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), gte(orders.createdAt, since)))
    return Math.max(r!.phone, r!.ip, r!.device)
  },
  hasDuplicate: async (storeId, phone, productIds, since) =>
    (
      await db
        .select({ id: orders.id })
        .from(orders)
        .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
        .where(
          and(
            eq(orders.storeId, storeId),
            eq(orders.shipPhone, phone),
            ne(orders.status, 'CANCELLED'),
            gte(orders.createdAt, since),
            inArray(orderItems.productId, productIds),
          ),
        )
        .limit(1)
    ).length > 0,
  async logAttempt(storeId, a) {
    await db.insert(fraudAttempts).values({ ...a, storeId })
  },
  attempts: (storeId, limit) =>
    db
      .select({
        reason: fraudAttempts.reason,
        phone: fraudAttempts.phone,
        ip: fraudAttempts.ip,
        deviceId: fraudAttempts.deviceId,
        createdAt: fraudAttempts.createdAt,
      })
      .from(fraudAttempts)
      .where(eq(fraudAttempts.storeId, storeId))
      .orderBy(desc(fraudAttempts.createdAt))
      .limit(limit),
  async courierHistory(storeId, phones) {
    if (phones.length === 0) return {}
    const n = (s: readonly string[]) =>
      sql<number>`count(*) filter (where ${inArray(orders.status, [...s] as OrderStatus[])})`.mapWith(
        Number,
      )
    const rows = await db
      .select({
        phone: orders.shipPhone,
        delivered: n(['DELIVERED', 'PARTIAL_DELIVERED', 'RETURNED']),
        returned: n(['RETURNING', 'RETURN_RECEIVED', 'RETURN_MISSING']),
      })
      .from(orders)
      .where(and(eq(orders.storeId, storeId), inArray(orders.shipPhone, phones)))
      .groupBy(orders.shipPhone)
    return Object.fromEntries(
      rows.map(({ phone, ...h }) => [phone, { ...h, total: h.delivered + h.returned }]),
    )
  },
  riskyPhones: (storeId, limit) => {
    const lost =
      sql<number>`count(*) filter (where ${inArray(orders.status, [...lostStatuses])})`.mapWith(
        Number,
      )
    return db
      .select({ phone: orders.shipPhone, lost, total: count() })
      .from(orders)
      .where(eq(orders.storeId, storeId))
      .groupBy(orders.shipPhone)
      .having(sql`${lost} > 0`)
      .orderBy(desc(lost), orders.shipPhone)
      .limit(limit)
  },
})
