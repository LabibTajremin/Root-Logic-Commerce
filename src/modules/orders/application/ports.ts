import type { ProductOptions, VariantOptions } from '@/modules/catalog'
import type { OrderSource, OrderStatus, StockEffect } from '../domain/status'

export type OrderProduct = {
  id: string
  name: string
  price: number
  costPrice: number
  stock: number
  status: string
  options: ProductOptions
  categoryId: string | null
  minQty: number | null
  maxQty: number | null
}
export type GeoPoint = { lat: number; lng: number; accuracy: number }
export type OrderVariant = {
  id: string
  productId: string
  options: VariantOptions
  price: number
  costPrice: number
  stock: number
}
export type OrderLine = {
  productId: string
  variantId: string | null
  variantLabel: string | null
  name: string
  unitPrice: number
  unitCost: number
  quantity: number
}
export type NewOrder = {
  customer: { phone: string; name: string; email: string | null }
  ship: {
    name: string
    phone: string
    altPhone: string | null
    address: string
    area: string
    district: string
  }
  preferredTime: string
  giftWrap: boolean
  location: GeoPoint | null
  note: string | null
  deliveryZone: string
  paymentMethod: string
  source: OrderSource
  client: { ip: string; deviceId: string } | null
  totals: { subtotal: number; deliveryCharge: number; discount: number; total: number }
  /** C2: redeemed in the same transaction (the total limit is re-checked there). */
  coupon: { id: string; code: string; totalLimit: number | null } | null
  items: OrderLine[]
}
export type OrderSummary = {
  id: string
  orderNo: number
  status: OrderStatus
  total: number
  shipName: string
  shipPhone: string
  source: OrderSource
  createdAt: Date
}
/** D1: an earlier order from the same phone with a product in common, within the window. */
export type DuplicateOf = { orderNo: number; status: OrderStatus; createdAt: Date }
export type OrderEvent = {
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  actorId: string | null
  note: string | null
  createdAt: Date
}
export type OrderDetail = OrderSummary & {
  subtotal: number
  deliveryCharge: number
  discount: number
  couponCode: string | null
  deliveryZone: string
  shipAddress: string
  shipArea: string
  shipDistrict: string
  shipAltPhone: string | null
  preferredTime: string
  giftWrap: boolean
  shipLocation: GeoPoint | null
  note: string | null
  paymentMethod: string
  paymentStatus: string
  stockDeducted: boolean
  scheduledFor: Date | null
  deletedAt: Date | null
  clientIp: string | null
  deviceId: string | null
  customerEmail: string | null
  items: (Omit<OrderLine, 'productId'> & { id: string; productId: string | null })[]
  events: OrderEvent[]
}
export type OrderReturn = {
  id: string
  kind: 'return' | 'exchange'
  reason: string
  note: string
  items: { itemId: string; quantity: number }[]
  refund: number
  refundMethod: string
  restocked: boolean
  exchangeOrderId: string | null
  exchangeOrderNo: number | null
  createdAt: Date
}
export type NewReturn = Omit<OrderReturn, 'id' | 'restocked' | 'exchangeOrderNo' | 'createdAt'> & {
  restock: boolean
}
export type OrderFilter = {
  status?: OrderStatus
  source?: OrderSource
  /** C13: the Trash instead of live orders. */
  trash?: boolean
  /** D1: how far back an earlier order counts as a possible duplicate (default 24). */
  duplicateHours?: number
  from?: Date
  to?: Date
  search?: string
  limit?: number
  offset?: number
}
export type StatusChange = {
  from: OrderStatus
  to: OrderStatus
  actorId: string | null
  note: string | null
  stock: StockEffect
  /** Set when the order is SCHEDULED, cleared otherwise. */
  scheduledFor: Date | null
  /** Partial delivery: the quantities going back on the shelf. */
  restock?: { itemId: string; quantity: number }[]
}

export type OrdersRepo = {
  productsForOrder(storeId: string, ids: string[]): Promise<OrderProduct[]>
  variantsForOrder(storeId: string, ids: string[]): Promise<OrderVariant[]>
  create(storeId: string, order: NewOrder): Promise<{ id: string; orderNo: number }>
  get(storeId: string, id: string): Promise<OrderDetail | null>
  findForTracking(storeId: string, orderNo: number, phone: string): Promise<OrderDetail | null>
  /** The newest order placed with this phone (C12 customer lookup). */
  latestForPhone(storeId: string, phone: string): Promise<OrderDetail | null>
  list(
    storeId: string,
    filter: OrderFilter,
  ): Promise<{ rows: (OrderSummary & { duplicateOf: DuplicateOf | null })[]; total: number }>
  /** C13: hide a cancelled order (false when it isn't cancelled or is already trashed). */
  trash(storeId: string, id: string): Promise<boolean>
  restore(storeId: string, id: string): Promise<void>
  /** C21, across stores: SCHEDULED orders now due, and RETURNING ones untouched since `before`. */
  dueScheduled(now: Date): Promise<{ storeId: string; id: string }[]>
  staleReturning(before: Date): Promise<{ storeId: string; id: string }[]>
  /** C14 */
  listReturns(storeId: string, orderId: string): Promise<OrderReturn[]>
  idByNo(storeId: string, orderNo: number): Promise<string | null>
  /** Atomic: the return row and, when asked, the returned units back in stock. */
  recordReturn(
    storeId: string,
    orderId: string,
    r: NewReturn,
    actorId: string | null,
  ): Promise<void>
  /** Atomic: status guard + stock effect + order_events row, or nothing. */
  transition(storeId: string, id: string, change: StatusChange): Promise<void>
}
