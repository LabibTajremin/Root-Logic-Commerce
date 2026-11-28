import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { DomainError } from '@/modules/shared'
import type { OrderDetail, OrdersRepo } from '@/modules/orders'
import { alias } from 'drizzle-orm/pg-core'
import type { Db } from '../client'
import {
  couponRedemptions,
  coupons,
  courierShipments,
  customers,
  orderEvents,
  orderItems,
  orderReturns,
  orders,
  productVariants,
  products,
  stores,
} from '../schema'
import { applyStock } from './stock-repo'

const summary = {
  id: orders.id,
  orderNo: orders.orderNo,
  status: orders.status,
  total: orders.total,
  shipName: orders.shipName,
  shipPhone: orders.shipPhone,
  source: orders.source,
  createdAt: orders.createdAt,
}
const detail = {
  ...summary,
  subtotal: orders.subtotal,
  deliveryCharge: orders.deliveryCharge,
  discount: orders.discount,
  couponCode: orders.couponCode,
  deliveryZone: orders.deliveryZone,
  shipAddress: orders.shipAddress,
  shipArea: orders.shipArea,
  shipDistrict: orders.shipDistrict,
  shipAltPhone: orders.shipAltPhone,
  preferredTime: orders.preferredTime,
  giftWrap: orders.giftWrap,
  shipLocation: orders.shipLocation,
  note: orders.note,
  paymentMethod: orders.paymentMethod,
  paymentStatus: orders.paymentStatus,
  stockDeducted: orders.stockDeducted,
  scheduledFor: orders.scheduledFor,
  deletedAt: orders.deletedAt,
  clientIp: orders.clientIp,
  deviceId: orders.deviceId,
}

export const createOrdersRepo = (db: Db): OrdersRepo => {
  const load = async (where: SQL): Promise<OrderDetail | null> => {
    const [o] = await db
      .select({ ...detail, customerEmail: customers.email })
      .from(orders)
      .leftJoin(customers, eq(customers.id, orders.customerId))
      .where(where)
    if (!o) return null
    const items = await db
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        variantId: orderItems.variantId,
        variantLabel: orderItems.variantLabel,
        name: orderItems.name,
        unitPrice: orderItems.unitPrice,
        unitCost: orderItems.unitCost,
        quantity: orderItems.quantity,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, o.id))
    const events = await db
      .select({
        fromStatus: orderEvents.fromStatus,
        toStatus: orderEvents.toStatus,
        actorId: orderEvents.actorId,
        note: orderEvents.note,
        createdAt: orderEvents.createdAt,
      })
      .from(orderEvents)
      .where(eq(orderEvents.orderId, o.id))
      .orderBy(asc(orderEvents.createdAt))
    return { ...o, items, events }
  }

  const insert: OrdersRepo['create'] = (storeId, o) =>
    db.transaction(async (tx) => {
      const [c] = await tx
        .insert(customers)
        .values({ storeId, ...o.customer })
        .onConflictDoUpdate({
          target: [customers.storeId, customers.phone],
          set: { name: o.customer.name },
        })
        .returning({ id: customers.id })
      const [seq] = await tx
        .update(stores)
        .set({ orderSeq: sql`${stores.orderSeq} + 1` })
        .where(eq(stores.id, storeId))
        .returning({ n: stores.orderSeq })
      const [created] = await tx
        .insert(orders)
        .values({
          storeId,
          orderNo: seq!.n,
          customerId: c!.id,
          shipName: o.ship.name,
          shipPhone: o.ship.phone,
          shipAddress: o.ship.address,
          shipArea: o.ship.area,
          shipDistrict: o.ship.district,
          shipAltPhone: o.ship.altPhone,
          preferredTime: o.preferredTime,
          giftWrap: o.giftWrap,
          shipLocation: o.location,
          source: o.source,
          landingId: o.landingId,
          clientIp: o.client?.ip,
          deviceId: o.client?.deviceId,
          note: o.note,
          deliveryZone: o.deliveryZone,
          paymentMethod: o.paymentMethod,
          ...o.totals,
          couponCode: o.coupon?.code ?? null,
        })
        .returning({ id: orders.id, orderNo: orders.orderNo })
      await tx.insert(orderItems).values(o.items.map((i) => ({ ...i, orderId: created!.id })))
      // C2: the total limit is re-checked here, so two last-use orders can't both win.
      if (o.coupon) {
        const [hit] = await tx
          .update(coupons)
          .set({ used: sql`${coupons.used} + 1` })
          .where(
            and(
              eq(coupons.id, o.coupon.id),
              o.coupon.totalLimit === null ? undefined : lt(coupons.used, o.coupon.totalLimit),
            ),
          )
          .returning({ id: coupons.id })
        if (!hit) throw new DomainError('coupon.used_up')
        await tx
          .insert(couponRedemptions)
          .values({ storeId, couponId: o.coupon.id, orderId: created!.id, phone: o.customer.phone })
      }
      await tx
        .insert(orderEvents)
        .values({ orderId: created!.id, toStatus: 'PENDING', note: 'Order placed' })
      return created!
    })

  return {
    productsForOrder: (storeId, ids) =>
      db
        .select({
          id: products.id,
          name: products.name,
          price: products.price,
          costPrice: products.costPrice,
          stock: products.stock,
          status: products.status,
          options: products.options,
          categoryId: products.categoryId,
          minQty: products.minQty,
          maxQty: products.maxQty,
        })
        .from(products)
        .where(and(eq(products.storeId, storeId), inArray(products.id, ids))),
    variantsForOrder: (storeId, ids) =>
      db
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          options: productVariants.options,
          price: productVariants.price,
          costPrice: productVariants.costPrice,
          stock: productVariants.stock,
        })
        .from(productVariants)
        .where(and(eq(productVariants.storeId, storeId), inArray(productVariants.id, ids))),

    create: insert,

    get: (storeId, id) => load(and(eq(orders.storeId, storeId), eq(orders.id, id))!),
    findForTracking: (storeId, orderNo, phone) =>
      load(
        and(eq(orders.storeId, storeId), eq(orders.orderNo, orderNo), eq(orders.shipPhone, phone))!,
      ),

    async latestForPhone(storeId, phone) {
      const [row] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(and(eq(orders.storeId, storeId), eq(orders.shipPhone, phone)))
        .orderBy(desc(orders.createdAt), desc(orders.orderNo))
        .limit(1)
      return row ? load(eq(orders.id, row.id)) : null
    },

    async list(storeId, f) {
      const where: SQL[] = [eq(orders.storeId, storeId)]
      if (f.status) where.push(eq(orders.status, f.status))
      if (f.source) where.push(eq(orders.source, f.source))
      where.push(f.trash ? isNotNull(orders.deletedAt) : isNull(orders.deletedAt))
      if (f.from) where.push(gte(orders.createdAt, f.from))
      if (f.to) where.push(lte(orders.createdAt, f.to))
      if (f.search) {
        const q = f.search.replace(/^#/, '').trim()
        where.push(or(ilike(orders.shipPhone, `%${q}%`), sql`${orders.orderNo}::text = ${q}`)!)
      }
      const cond = and(...where)
      const rows = await db
        .select({
          ...summary,
          shipAddress: orders.shipAddress,
          shipArea: orders.shipArea,
          shipDistrict: orders.shipDistrict,
          deliveryCharge: orders.deliveryCharge,
          paymentStatus: orders.paymentStatus,
          note: orders.note,
          // E2: the parcel and the courier's own status word, when the order has been sent.
          parcelProvider: courierShipments.provider,
          parcelTracking: courierShipments.tracking,
          parcelStatus: courierShipments.rawStatus,
        })
        .from(orders)
        .leftJoin(courierShipments, eq(courierShipments.orderId, orders.id))
        .where(cond)
        .orderBy(desc(orders.createdAt), desc(orders.orderNo))
        .limit(f.limit ?? 50)
        .offset(f.offset ?? 0)
      const [{ n }] = (await db.select({ n: count() }).from(orders).where(cond)) as [{ n: number }]
      // D1: the nearest earlier order with the same phone and a shared product.
      const earlier = alias(orders, 'earlier')
      const hours = f.duplicateHours ?? 24
      const dups = await db
        .select({
          id: orders.id,
          orderNo: earlier.orderNo,
          status: earlier.status,
          createdAt: earlier.createdAt,
        })
        .from(orders)
        .innerJoin(
          earlier,
          and(
            eq(earlier.storeId, orders.storeId),
            eq(earlier.shipPhone, orders.shipPhone),
            lt(earlier.createdAt, orders.createdAt),
            gte(earlier.createdAt, sql`${orders.createdAt} - make_interval(hours => ${hours})`),
          ),
        )
        .where(
          and(
            inArray(
              orders.id,
              rows.map((r) => r.id),
            ),
            sql`exists (select 1 from order_items a join order_items b on b.product_id = a.product_id where a.order_id = ${orders.id} and b.order_id = ${earlier.id})`,
          ),
        )
        .orderBy(desc(earlier.createdAt))
      // F12: each row's products with their current SKU.
      const lines = await db
        .select({
          orderId: orderItems.orderId,
          name: orderItems.name,
          variantLabel: orderItems.variantLabel,
          quantity: orderItems.quantity,
          sku: products.sku,
        })
        .from(orderItems)
        .leftJoin(products, eq(products.id, orderItems.productId))
        .where(
          inArray(
            orderItems.orderId,
            rows.map((r) => r.id),
          ),
        )
        .orderBy(asc(orderItems.name))
      const dupOf = new Map<string, (typeof dups)[number]>()
      for (const d of dups) if (!dupOf.has(d.id)) dupOf.set(d.id, d)
      return {
        rows: rows.map(({ parcelProvider, parcelTracking, parcelStatus, ...r }) => {
          const d = dupOf.get(r.id)
          return {
            ...r,
            parcel: parcelProvider && {
              provider: parcelProvider,
              tracking: parcelTracking!,
              rawStatus: parcelStatus!,
            },
            duplicateOf: d
              ? { orderNo: d.orderNo, status: d.status, createdAt: d.createdAt }
              : null,
            lines: lines.filter((l) => l.orderId === r.id).map(({ orderId: _o, ...l }) => l),
          }
        }),
        total: n,
      }
    },

    listReturns: async (storeId, orderId) => {
      const swap = alias(orders, 'swap')
      return db
        .select({
          id: orderReturns.id,
          kind: orderReturns.kind,
          reason: orderReturns.reason,
          note: orderReturns.note,
          items: orderReturns.items,
          refund: orderReturns.refund,
          refundMethod: orderReturns.refundMethod,
          restocked: orderReturns.restocked,
          exchangeOrderId: orderReturns.exchangeOrderId,
          exchangeOrderNo: swap.orderNo,
          createdAt: orderReturns.createdAt,
        })
        .from(orderReturns)
        .leftJoin(swap, eq(swap.id, orderReturns.exchangeOrderId))
        .where(and(eq(orderReturns.storeId, storeId), eq(orderReturns.orderId, orderId)))
        .orderBy(asc(orderReturns.createdAt))
    },
    idByNo: async (storeId, orderNo) =>
      (
        await db
          .select({ id: orders.id })
          .from(orders)
          .where(and(eq(orders.storeId, storeId), eq(orders.orderNo, orderNo)))
      )[0]?.id ?? null,
    recordReturn: (storeId, orderId, { restock, ...r }, actorId) =>
      db.transaction(async (tx) => {
        await tx
          .insert(orderReturns)
          .values({ ...r, storeId, orderId, restocked: restock, actorId })
        if (!restock) return
        const lines = new Map(
          (
            await tx
              .select({
                id: orderItems.id,
                productId: orderItems.productId,
                variantId: orderItems.variantId,
              })
              .from(orderItems)
              .where(eq(orderItems.orderId, orderId))
          ).map((l) => [l.id, l]),
        )
        // Lines whose product was deleted since have nothing to restock.
        const moves = r.items.flatMap((i) => {
          const l = lines.get(i.itemId)!
          return l.productId
            ? [{ productId: l.productId, variantId: l.variantId, quantity: i.quantity }]
            : []
        })
        await applyStock(tx, storeId, moves, 1, { reason: 'order_restocked', orderId, actorId })
      }),

    async history(storeId, o) {
      const [previous, [device]] = await Promise.all([
        db
          .select(summary)
          .from(orders)
          .where(
            and(eq(orders.storeId, storeId), eq(orders.shipPhone, o.phone), ne(orders.id, o.id)),
          )
          .orderBy(desc(orders.createdAt))
          .limit(10),
        db
          .select({ n: count() })
          .from(orders)
          .where(and(eq(orders.storeId, storeId), eq(orders.deviceId, String(o.deviceId)))),
      ])
      return { previous, deviceOrders: device!.n }
    },
    async updateShipping(storeId, id, s) {
      await db
        .update(orders)
        .set({
          shipName: s.name,
          shipAltPhone: s.altPhone,
          shipAddress: s.address,
          shipArea: s.area,
          shipDistrict: s.district,
          updatedAt: new Date(),
        })
        .where(and(eq(orders.storeId, storeId), eq(orders.id, id)))
    },

    async trash(storeId, id) {
      const rows = await db
        .update(orders)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(orders.storeId, storeId),
            eq(orders.id, id),
            eq(orders.status, 'CANCELLED'),
            isNull(orders.deletedAt),
          ),
        )
        .returning({ id: orders.id })
      return rows.length > 0
    },
    async restore(storeId, id) {
      await db
        .update(orders)
        .set({ deletedAt: null })
        .where(and(eq(orders.storeId, storeId), eq(orders.id, id)))
    },
    dueScheduled: (now) =>
      db
        .select({ storeId: orders.storeId, id: orders.id })
        .from(orders)
        .where(and(eq(orders.status, 'SCHEDULED'), lte(orders.scheduledFor, now))),
    staleReturning: (before) =>
      db
        .select({ storeId: orders.storeId, id: orders.id })
        .from(orders)
        .where(and(eq(orders.status, 'RETURNING'), lt(orders.updatedAt, before))),

    transition: (storeId, id, ch) =>
      db.transaction(async (tx) => {
        const deducted = ch.stock === 'deduct' ? true : ch.stock === 'restock' ? false : undefined
        const [row] = await tx
          .update(orders)
          .set({
            status: ch.to,
            scheduledFor: ch.scheduledFor,
            updatedAt: new Date(),
            ...(deducted === undefined ? {} : { stockDeducted: deducted }),
          })
          .where(and(eq(orders.storeId, storeId), eq(orders.id, id), eq(orders.status, ch.from)))
          .returning({ id: orders.id })
        if (!row) throw new DomainError('order.conflict')
        if (ch.stock) {
          const items = await tx
            .select({
              id: orderItems.id,
              productId: orderItems.productId,
              variantId: orderItems.variantId,
              quantity: orderItems.quantity,
            })
            .from(orderItems)
            .where(eq(orderItems.orderId, id))
          // Partial delivery restocks only the given quantities; anything else moves whole lines.
          const back = new Map((ch.restock ?? []).map((r) => [r.itemId, r.quantity]))
          const moves = items
            .filter((i): i is typeof i & { productId: string } => i.productId !== null)
            .map((i) => ({
              ...i,
              quantity: ch.stock === 'partial' ? (back.get(i.id) ?? 0) : i.quantity,
            }))
            .filter((i) => i.quantity > 0)
          await applyStock(tx, storeId, moves, ch.stock === 'deduct' ? -1 : 1, {
            reason: ch.stock === 'deduct' ? 'order_confirmed' : 'order_restocked',
            orderId: id,
            actorId: ch.actorId,
          })
        }
        await tx.insert(orderEvents).values({
          orderId: id,
          fromStatus: ch.from,
          toStatus: ch.to,
          actorId: ch.actorId,
          note: ch.note,
        })
      }),
  }
}
