import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lt,
  lte,
  or,
  sql,
  type SQL,
} from 'drizzle-orm'
import { DomainError } from '@/modules/shared'
import type { OrderDetail, OrdersRepo } from '@/modules/orders'
import type { Db } from '../client'
import {
  couponRedemptions,
  coupons,
  customers,
  orderEvents,
  orderItems,
  orders,
  products,
  productVariants,
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
  note: orders.note,
  paymentMethod: orders.paymentMethod,
  paymentStatus: orders.paymentStatus,
  stockDeducted: orders.stockDeducted,
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

    async list(storeId, f) {
      const where: SQL[] = [eq(orders.storeId, storeId)]
      if (f.status) where.push(eq(orders.status, f.status))
      if (f.from) where.push(gte(orders.createdAt, f.from))
      if (f.to) where.push(lte(orders.createdAt, f.to))
      if (f.search) {
        const q = f.search.replace(/^#/, '').trim()
        where.push(or(ilike(orders.shipPhone, `%${q}%`), sql`${orders.orderNo}::text = ${q}`)!)
      }
      const cond = and(...where)
      const rows = await db
        .select(summary)
        .from(orders)
        .where(cond)
        .orderBy(desc(orders.createdAt), desc(orders.orderNo))
        .limit(f.limit ?? 50)
        .offset(f.offset ?? 0)
      const [{ n }] = (await db.select({ n: count() }).from(orders).where(cond)) as [{ n: number }]
      return { rows, total: n }
    },

    transition: (storeId, id, ch) =>
      db.transaction(async (tx) => {
        const deducted = ch.stock === 'deduct' ? true : ch.stock === 'restock' ? false : undefined
        const [row] = await tx
          .update(orders)
          .set({
            status: ch.to,
            updatedAt: new Date(),
            ...(deducted === undefined ? {} : { stockDeducted: deducted }),
          })
          .where(and(eq(orders.storeId, storeId), eq(orders.id, id), eq(orders.status, ch.from)))
          .returning({ id: orders.id })
        if (!row) throw new DomainError('order.conflict')
        if (ch.stock) {
          const items = await tx
            .select({
              productId: orderItems.productId,
              variantId: orderItems.variantId,
              quantity: orderItems.quantity,
            })
            .from(orderItems)
            .where(eq(orderItems.orderId, id))
          const moves = items.filter(
            (i): i is typeof i & { productId: string } => i.productId !== null,
          )
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
