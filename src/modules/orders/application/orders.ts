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
    const lines = items.map(({ productId, quantity }) => {
      const p = products.get(productId)
      if (!p || p.status !== 'active') throw new DomainError('product.unavailable', { productId })
      // Soft check only: the hard, atomic check happens when the order is confirmed.
      if (p.stock < quantity)
        throw new DomainError('stock.insufficient', { productId, available: p.stock })
      return { productId, name: p.name, unitPrice: p.price, unitCost: p.costPrice, quantity }
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
    return p ? repo.findForTracking(storeId, orderNo, p) : Promise.resolve(null)
  },
})

export type Orders = ReturnType<typeof createOrders>
