import {
  and,
  asc,
  getTableColumns,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  notInArray,
  sql,
  type SQL,
} from 'drizzle-orm'
import { finalStates, type CourierRepo, type Shipment, type Unsettled } from '@/modules/courier'
import type { Db } from '../client'
import { courierAccounts, courierEvents, courierShipments, orderItems, orders } from '../schema'

const account = {
  id: courierAccounts.id,
  provider: courierAccounts.provider,
  label: courierAccounts.label,
  isDefault: courierAccounts.isDefault,
  webhookToken: courierAccounts.webhookToken,
  createdAt: courierAccounts.createdAt,
}

const one = async <T>(rows: Promise<T[]>) => (await rows)[0] ?? null

export const createCourierRepo = (db: Db): CourierRepo => {
  const shipments = () => db.select().from(courierShipments)
  const setDefault = async (storeId: string, id: string) => {
    await db
      .update(courierAccounts)
      .set({ isDefault: sql`${courierAccounts.id} = ${id}` })
      .where(eq(courierAccounts.storeId, storeId))
  }
  return {
    async addAccount(storeId, a) {
      const [{ n }] = (await db
        .select({ n: sql<number>`count(*)`.mapWith(Number) })
        .from(courierAccounts)
        .where(eq(courierAccounts.storeId, storeId))) as [{ n: number }]
      // The first account a shop adds is the one orders go to.
      const [row] = await db
        .insert(courierAccounts)
        .values({
          storeId,
          provider: a.provider,
          label: a.label,
          credentials: a.sealed,
          webhookToken: a.webhookToken,
          isDefault: n === 0,
        })
        .returning({ id: courierAccounts.id })
      return row!.id
    },
    listAccounts: (storeId) =>
      db
        .select(account)
        .from(courierAccounts)
        .where(eq(courierAccounts.storeId, storeId))
        .orderBy(asc(courierAccounts.createdAt)),
    async removeAccount(storeId, id) {
      await db
        .delete(courierAccounts)
        .where(and(eq(courierAccounts.storeId, storeId), eq(courierAccounts.id, id)))
      const left = await db
        .select(account)
        .from(courierAccounts)
        .where(eq(courierAccounts.storeId, storeId))
        .orderBy(asc(courierAccounts.createdAt))
      if (left.length > 0 && !left.some((a) => a.isDefault)) await setDefault(storeId, left[0]!.id)
    },
    setDefault,
    sealed: (storeId, id) =>
      one(
        db
          .select({ provider: courierAccounts.provider, sealed: courierAccounts.credentials })
          .from(courierAccounts)
          .where(and(eq(courierAccounts.storeId, storeId), eq(courierAccounts.id, id))),
      ),
    accountByToken: (token) =>
      one(
        db
          .select({
            id: courierAccounts.id,
            storeId: courierAccounts.storeId,
            provider: courierAccounts.provider,
          })
          .from(courierAccounts)
          .where(eq(courierAccounts.webhookToken, token)),
      ),
    async addShipment(storeId, s) {
      const [row] = await db
        .insert(courierShipments)
        .values({ ...s, storeId })
        .returning()
      return row as Shipment
    },
    shipmentForOrder: (storeId, orderId) =>
      one(
        shipments().where(
          and(eq(courierShipments.storeId, storeId), eq(courierShipments.orderId, orderId)),
        ),
      ) as Promise<Shipment | null>,
    shipmentByRef: (accountId, ref) =>
      one(
        shipments().where(
          and(eq(courierShipments.accountId, accountId), eq(courierShipments.ref, ref)),
        ),
      ) as Promise<Shipment | null>,
    async updateShipment(storeId, id, u) {
      await db.transaction(async (tx) => {
        await tx
          .update(courierShipments)
          .set({ rawStatus: u.rawStatus, state: u.state, charge: u.charge, updatedAt: new Date() })
          .where(eq(courierShipments.id, id))
        await tx.insert(courierEvents).values({
          storeId,
          shipmentId: id,
          rawStatus: u.rawStatus,
          state: u.state,
          payload: u.payload,
        })
      })
    },
    staleShipments: (before, limit) =>
      shipments()
        .where(
          and(
            notInArray(courierShipments.state, finalStates),
            lt(courierShipments.updatedAt, before),
            isNotNull(courierShipments.accountId),
          ),
        )
        .orderBy(asc(courierShipments.updatedAt))
        .limit(limit) as Promise<Shipment[]>,
    parcelFacts(storeId, f) {
      const where: SQL[] = [eq(courierShipments.storeId, storeId)]
      if (f.from) where.push(gte(courierShipments.createdAt, f.from))
      if (f.to) where.push(lte(courierShipments.createdAt, f.to))
      if (f.productId)
        where.push(
          exists(
            db
              .select({ one: sql`1` })
              .from(orderItems)
              .where(
                and(
                  eq(orderItems.orderId, courierShipments.orderId),
                  eq(orderItems.productId, f.productId),
                ),
              ),
          ),
        )
      return db
        .select({
          provider: courierShipments.provider,
          state: courierShipments.state,
          createdAt: courierShipments.createdAt,
          updatedAt: courierShipments.updatedAt,
        })
        .from(courierShipments)
        .where(and(...where))
    },
    unsettled: (storeId) =>
      db
        .select({ ...getTableColumns(courierShipments), orderNo: orders.orderNo })
        .from(courierShipments)
        .innerJoin(orders, eq(orders.id, courierShipments.orderId))
        .where(
          and(
            eq(courierShipments.storeId, storeId),
            inArray(courierShipments.state, ['delivered', 'partial']),
            isNull(courierShipments.paidOutAt),
          ),
        )
        .orderBy(asc(courierShipments.updatedAt)) as Promise<Unsettled[]>,
    async setAmounts(storeId, id, a) {
      await db
        .update(courierShipments)
        .set({ codCollected: a.collected, charge: a.charge })
        .where(and(eq(courierShipments.storeId, storeId), eq(courierShipments.id, id)))
    },
    async markPaid(storeId, ids, at) {
      if (ids.length === 0) return 0
      const done = await db
        .update(courierShipments)
        .set({ paidOutAt: at })
        .where(
          and(
            eq(courierShipments.storeId, storeId),
            inArray(courierShipments.id, ids),
            isNull(courierShipments.paidOutAt),
          ),
        )
        .returning({ id: courierShipments.id })
      return done.length
    },
    async chargesSince(storeId, since) {
      const [r] = await db
        .select({ n: sql<number>`coalesce(sum(${courierShipments.charge}), 0)`.mapWith(Number) })
        .from(courierShipments)
        .where(and(eq(courierShipments.storeId, storeId), gte(courierShipments.createdAt, since)))
      return r!.n
    },
  }
}
