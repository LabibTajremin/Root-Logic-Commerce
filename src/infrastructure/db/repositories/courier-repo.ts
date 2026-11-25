import { and, asc, eq, isNotNull, lt, notInArray, sql } from 'drizzle-orm'
import { finalStates, type CourierRepo, type Shipment } from '@/modules/courier'
import type { Db } from '../client'
import { courierAccounts, courierEvents, courierShipments } from '../schema'

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
  }
}
