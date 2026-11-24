import { variantLabel } from '@/modules/catalog'
import { applyCoupon, type Coupon, type Coupons } from '@/modules/coupons'
import { normalizeBdPhone } from '@/modules/customers'
import { DomainError, validate, type EventBus } from '@/modules/shared'
import {
  checkoutInput,
  computeTotals,
  mergeItems,
  type CheckoutInput,
  type DeliveryZone,
} from '../domain/checkout'
import { checkLimits, freeShipping, type ShopRules } from '../domain/rules'
import { canTransition, stockEffect, type OrderStatus } from '../domain/status'
import type { OrderFilter, OrdersRepo } from './ports'

type EventPayload = { storeId: string; orderId: string; orderNo: number }
type StatusEventName = `order.${Lowercase<Exclude<OrderStatus, 'PENDING'>>}`
export type OrderEvents = { 'order.placed': EventPayload } & Record<StatusEventName, EventPayload>

type Deps = {
  repo: OrdersRepo
  bus: EventBus<OrderEvents>
  coupons: Pick<Coupons, 'find' | 'auto' | 'usedByPhone'>
}

export const createOrders = ({ repo, bus, coupons }: Deps) => {
  /** Lines, delivery and the coupon (typed, else the best automatic one) for a cart. */
  const price = async (storeId: string, input: CheckoutInput, shop: ShopRules<DeliveryZone>) => {
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
    if (d.couponCode) {
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

    async placeOrder(storeId: string, input: CheckoutInput, shop: ShopRules<DeliveryZone>) {
      const { d, zone, lines, coupon, totals } = await price(storeId, input, shop)
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
        deliveryZone: zone.label,
        paymentMethod: d.paymentMethod,
        totals,
        coupon: coupon && { id: coupon.id, code: coupon.code, totalLimit: coupon.totalLimit },
        items: lines,
      })
      await bus.emit('order.placed', { storeId, orderId: created.id, orderNo: created.orderNo })
      return created
    },

    async changeStatus(
      storeId: string,
      id: string,
      to: OrderStatus,
      actorId: string | null,
      note: string | null = null,
    ) {
      const order = await repo.get(storeId, id)
      if (!order) throw new DomainError('order.not_found')
      if (!canTransition(order.status, to))
        throw new DomainError('order.invalid_transition', { from: order.status, to })
      await repo.transition(storeId, id, {
        from: order.status,
        to,
        actorId,
        note,
        stock: stockEffect(to, order.stockDeducted),
      })
      const event = `order.${to.toLowerCase()}` as StatusEventName
      await bus.emit(event, { storeId, orderId: id, orderNo: order.orderNo })
    },

    getOrder: (storeId: string, id: string) => repo.get(storeId, id),
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
