import type { ProductOptions, VariantOptions } from '@/modules/catalog'
import type { OrderStatus, StockEffect } from '../domain/status'

export type OrderProduct = {
  id: string
  name: string
  price: number
  costPrice: number
  stock: number
  status: string
  options: ProductOptions
}
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
  ship: { name: string; phone: string; address: string; area: string; district: string }
  note: string | null
  deliveryZone: string
  paymentMethod: string
  totals: { subtotal: number; deliveryCharge: number; total: number }
  items: OrderLine[]
}
export type OrderSummary = {
  id: string
  orderNo: number
  status: OrderStatus
  total: number
  shipName: string
  shipPhone: string
  createdAt: Date
}
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
  deliveryZone: string
  shipAddress: string
  shipArea: string
  shipDistrict: string
  note: string | null
  paymentMethod: string
  paymentStatus: string
  stockDeducted: boolean
  customerEmail: string | null
  items: (Omit<OrderLine, 'productId'> & { productId: string | null })[]
  events: OrderEvent[]
}
export type OrderFilter = {
  status?: OrderStatus
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
}

export type OrdersRepo = {
  productsForOrder(storeId: string, ids: string[]): Promise<OrderProduct[]>
  variantsForOrder(storeId: string, ids: string[]): Promise<OrderVariant[]>
  create(storeId: string, order: NewOrder): Promise<{ id: string; orderNo: number }>
  get(storeId: string, id: string): Promise<OrderDetail | null>
  findForTracking(storeId: string, orderNo: number, phone: string): Promise<OrderDetail | null>
  list(storeId: string, filter: OrderFilter): Promise<{ rows: OrderSummary[]; total: number }>
  /** Atomic: status guard + stock effect + order_events row, or nothing. */
  transition(storeId: string, id: string, change: StatusChange): Promise<void>
}
