import { variantLabel } from '@/modules/catalog'
import { applyCoupon, type Coupon, type Coupons } from '@/modules/coupons'
import type { Client, Fraud, FraudRules } from '@/modules/fraud'
import { normalizeBdPhone } from '@/modules/customers'
import { z } from 'zod'
import { DomainError, validate, type EventBus } from '@/modules/shared'
import {
  checkoutInput,
  computeTotals,
  mergeItems,
  type CheckoutInput,
  type DeliveryZone,
} from '../domain/checkout'
import { checkLimits, freeShipping, type ShopRules } from '../domain/rules'
import { checkReturn, returnInput, type ReturnInput } from '../domain/returns'
import { editableStatuses, shippingInput, type ShippingInput } from '../domain/checkout'
import {
  canTransition,
  orderSources,
  returnMissingDays,
  stockEffect,
  undelivered,
  type OrderSource,
  type OrderStatus,
} from '../domain/status'
import type { OrderFilter, OrdersRepo } from './ports'

type EventPayload = { storeId: string; orderId: string; orderNo: number }
type StatusEventName = `order.${Lowercase<OrderStatus>}`
export type OrderEvents = { 'order.placed': EventPayload } & Record<StatusEventName, EventPayload>

type Deps = {
  repo: OrdersRepo
  bus: EventBus<OrderEvents>
  coupons: Pick<Coupons, 'find' | 'auto' | 'usedByPhone'>
  fraud: Pick<Fraud, 'check'>
}

export const createOrders = ({ repo, bus, coupons, fraud }: Deps) => {
  /** Lines, delivery and the coupon (typed, else the best automatic one) for a cart. */
  /** `manual`: a discount the shop types in (C12) instead of any coupon. */
  const price = async (
    storeId: string,
    input: CheckoutInput,
    shop: ShopRules<DeliveryZone>,
    manual?: number,
  ) => {
    const d = validate(checkoutInput, input)
    const zone = shop.zones.find((z) => z.id === d.zoneId)
    if (!zone) throw new DomainError('checkout.zone_invalid')
    const items = mergeItems(d.items)
    const products = new Map(
      (
        await repo.productsForOrder(
          storeId,
          items.map((i) => i.productId),
        )
      ).map((p) => [p.id, p]),
    )
    const variants = new Map(
      (
        await repo.variantsForOrder(
          storeId,
          items.flatMap((i) => (i.variantId ? [i.variantId] : [])),
        )
      ).map((v) => [v.id, v]),
    )
    const lines = items.map(({ productId, variantId, quantity }) => {
      const p = products.get(productId)
      const v = variants.get(variantId ?? '')
      // A product with options is bought as one of its own variants; a plain one never is.
      if (
        !p ||
        p.status !== 'active' ||
        (p.options.length > 0 ? v?.productId !== p.id : variantId !== null)
      )
        throw new DomainError('product.unavailable', { productId })
      const unit = v ?? p
      // Soft check only: the hard, atomic check happens when the order is confirmed.
      if (unit.stock < quantity)
        throw new DomainError('stock.insufficient', { productId, available: unit.stock })
      return {
        productId,
        variantId,
        variantLabel: v ? variantLabel(p.options, v.options) : null,
        name: p.name,
        unitPrice: unit.price,
        unitCost: unit.costPrice,
        quantity,
      }
    })
    const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0)
    const breach = checkLimits(
      lines.map((l) => ({
        ...l,
        min: products.get(l.productId)!.minQty,
        max: products.get(l.productId)!.maxQty,
      })),
      subtotal,
      shop.limits,
    )
    if (breach) throw new DomainError(breach.code, breach)
    // C3: free delivery by subtotal, zone or product.
    const charge = freeShipping(shop.freeShipping, {
      subtotal,
      zoneId: zone.id,
      productIds: lines.map((l) => l.productId),
    }).free
      ? 0
      : zone.charge
    const amounts = lines.map((l) => ({
      productId: l.productId,
      categoryId: products.get(l.productId)!.categoryId,
      amount: l.unitPrice * l.quantity,
    }))
    const tryCoupon = async (c: Coupon) =>
      applyCoupon(c, {
        lines: amounts,
        delivery: charge,
        now: new Date(),
        usedByPhone: await coupons.usedByPhone(c.id, d.phone),
      })
    let coupon: Coupon | null = null
    let discount = 0
    if (manual !== undefined) {
      if (!Number.isSafeInteger(manual) || manual < 0 || manual > subtotal + charge)
        throw new DomainError('order.discount_invalid')
      discount = manual
    } else if (d.couponCode) {
      coupon = await coupons.find(storeId, d.couponCode)
      if (!coupon) throw new DomainError('coupon.invalid')
      const r = await tryCoupon(coupon)
      if (!r.ok) throw new DomainError(r.reason)
      discount = r.discount
    } else {
      // No code typed: the best automatic coupon that fits, if any.
      for (const c of await coupons.auto(storeId)) {
        const r = await tryCoupon(c)
        if (r.ok && r.discount > discount) [coupon, discount] = [c, r.discount]
      }
    }
    return { d, zone, lines, coupon, totals: computeTotals(lines, charge, discount) }
  }

  return {
    /** C2: what checkout shows before placing (same rules as placing). */
    async quote(storeId: string, input: CheckoutInput, shop: ShopRules<DeliveryZone>) {
      const { coupon, totals } = await price(storeId, input, shop)
      return { ...totals, couponCode: coupon?.code ?? null }
    },

    /**
     * C12/C15: the shop places manual orders with a `source` and its own `discount`.
     * D1/D3/D4: web checkout passes `guard` (who is ordering + the shop's rules).
     */
    async placeOrder(
      storeId: string,
      input: CheckoutInput,
      shop: ShopRules<DeliveryZone>,
      by: {
        source?: OrderSource
        discount?: number
        /** H5: the landing page it was placed on. */
        landingId?: string
        guard?: { client: Omit<Client, 'phone'>; rules: FraudRules }
      } = {},
    ) {
      const { d, zone, lines, coupon, totals } = await price(storeId, input, shop, by.discount)
      const client = by.guard ? { ...by.guard.client, phone: d.phone } : null
      if (client)
        await fraud.check(
          storeId,
          client,
          lines.map((l) => l.productId),
          by.guard!.rules,
        )
      const created = await repo.create(storeId, {
        customer: { phone: d.phone, name: d.name, email: d.email },
        ship: {
          name: d.name,
          phone: d.phone,
          altPhone: d.altPhone,
          address: d.address,
          area: d.area,
          district: d.district,
        },
        note: d.note,
        preferredTime: d.preferredTime,
        giftWrap: d.giftWrap,
        location: d.location,
        deliveryZone: zone.label,
        paymentMethod: d.paymentMethod,
        source: validate(z.enum(orderSources).default('web'), by.source),
        landingId: by.landingId ?? null,
        client: client && { ip: client.ip, deviceId: client.deviceId },
        totals,
        coupon: coupon && { id: coupon.id, code: coupon.code, totalLimit: coupon.totalLimit },
        items: lines,
      })
      await bus.emit('order.placed', { storeId, orderId: created.id, orderNo: created.orderNo })
      return { ...created, phone: d.phone }
    },

    /** `extra`: the date for SCHEDULED, delivered counts per line for PARTIAL_DELIVERED. */
    async changeStatus(
      storeId: string,
      id: string,
      to: OrderStatus,
      actorId: string | null,
      note: string | null = null,
      extra: { scheduledFor?: Date; delivered?: Record<string, number> } = {},
    ) {
      const order = await repo.get(storeId, id)
      if (!order) throw new DomainError('order.not_found')
      if (!canTransition(order.status, to))
        throw new DomainError('order.invalid_transition', { from: order.status, to })
      const when = extra.scheduledFor
      if (to === 'SCHEDULED' && !(when && when.getTime() > Date.now()))
        throw new DomainError('order.schedule_invalid')
      const stock = stockEffect(to, order.stockDeducted)
      await repo.transition(storeId, id, {
        from: order.status,
        to,
        actorId,
        note,
        stock,
        scheduledFor: to === 'SCHEDULED' ? when! : null,
        ...(stock === 'partial' && { restock: undelivered(order.items, extra.delivered ?? {}) }),
      })
      const event = `order.${to.toLowerCase()}` as StatusEventName
      await bus.emit(event, { storeId, orderId: id, orderNo: order.orderNo })
    },

    /** C14: only delivered (or partly delivered) orders take returns and exchanges. */
    async recordReturn(
      storeId: string,
      orderId: string,
      input: ReturnInput,
      actorId: string | null,
    ) {
      const r = validate(returnInput, input)
      const order = await repo.get(storeId, orderId)
      if (!order) throw new DomainError('order.not_found')
      if (order.status !== 'DELIVERED' && order.status !== 'PARTIAL_DELIVERED')
        throw new DomainError('return.not_delivered')
      checkReturn(order, await repo.listReturns(storeId, orderId), r)
      const swap = r.exchangeOrderNo === null ? null : await repo.idByNo(storeId, r.exchangeOrderNo)
      if (r.exchangeOrderNo !== null && !swap) throw new DomainError('return.exchange_not_found')
      const { exchangeOrderNo: _n, ...rest } = r
      await repo.recordReturn(storeId, orderId, { ...rest, exchangeOrderId: swap }, actorId)
    },
    listReturns: (storeId: string, orderId: string) => repo.listReturns(storeId, orderId),

    /** F12: the customer's earlier orders and this device's order count. */
    history: (storeId: string, o: { id: string; shipPhone: string; deviceId: string | null }) =>
      repo.history(storeId, { id: o.id, phone: o.shipPhone, deviceId: o.deviceId }),

    /** F12: fix the name / address until the parcel leaves. */
    async editShipping(storeId: string, id: string, input: ShippingInput) {
      const order = await repo.get(storeId, id)
      if (!order) throw new DomainError('order.not_found')
      if (!editableStatuses.includes(order.status)) throw new DomainError('order.locked')
      await repo.updateShipping(storeId, id, validate(shippingInput, input))
    },

    async trash(storeId: string, id: string) {
      if (!(await repo.trash(storeId, id))) throw new DomainError('order.trash_invalid')
    },
    restore: (storeId: string, id: string) => repo.restore(storeId, id),

    /** C21 (cron): due SCHEDULED orders go back to PENDING; long RETURNING ones go missing. */
    async runStatusRules(now = new Date()) {
      const due = await repo.dueScheduled(now)
      for (const o of due)
        await this.changeStatus(o.storeId, o.id, 'PENDING', null, 'system: scheduled date reached')
      const stale = await repo.staleReturning(
        new Date(now.getTime() - returnMissingDays * 86_400_000),
      )
      for (const o of stale)
        await this.changeStatus(
          o.storeId,
          o.id,
          'RETURN_MISSING',
          null,
          'system: not received in time',
        )
      return { scheduled: due.length, missing: stale.length }
    },

    getOrder: (storeId: string, id: string) => repo.get(storeId, id),
    /** C12: the last name and address used with this phone, to prefill a manual order. */
    lastForPhone(storeId: string, phone: string) {
      const p = normalizeBdPhone(phone)
      return p ? repo.latestForPhone(storeId, p) : Promise.resolve(null)
    },
    listOrders: (storeId: string, filter: OrderFilter = {}) => repo.list(storeId, filter),

    // Public tracking needs order number + the phone it was placed with.
    trackOrder(storeId: string, orderNo: number, phone: string) {
      const p = normalizeBdPhone(phone)
      return p && Number.isSafeInteger(orderNo)
        ? repo.findForTracking(storeId, orderNo, p)
        : Promise.resolve(null)
    },
  }
}

export type Orders = ReturnType<typeof createOrders>
