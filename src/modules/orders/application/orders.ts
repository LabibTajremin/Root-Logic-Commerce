import { variantLabel } from '@/modules/catalog'
import { normalizeBdPhone } from '@/modules/customers'
import { DomainError, validate, type EventBus } from '@/modules/shared'
import {
  checkoutInput,
  computeTotals,
  mergeItems,
  type CheckoutInput,
  type DeliveryZone,
} from '../domain/checkout'
import { canTransition, stockEffect, type OrderStatus } from '../domain/status'
import type { OrderFilter, OrdersRepo } from './ports'

type EventPayload = { storeId: string; orderId: string; orderNo: number }
type StatusEventName = `order.${Lowercase<Exclude<OrderStatus, 'PENDING'>>}`
export type OrderEvents = { 'order.placed': EventPayload } & Record<StatusEventName, EventPayload>

type Deps = { repo: OrdersRepo; bus: EventBus<OrderEvents> }

export const createOrders = ({ repo, bus }: Deps) => ({
  async placeOrder(storeId: string, input: CheckoutInput, zones: DeliveryZone[]) {
    const d = validate(checkoutInput, input)
    const zone = zones.find((z) => z.id === d.zoneId)
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
    const created = await repo.create(storeId, {
      customer: { phone: d.phone, name: d.name, email: d.email },
      ship: {
        name: d.name,
        phone: d.phone,
        address: d.address,
        area: d.area,
        district: d.district,
      },
      note: d.note,
      deliveryZone: zone.label,
      paymentMethod: d.paymentMethod,
      totals: computeTotals(lines, zone.charge),
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
})

export type Orders = ReturnType<typeof createOrders>
