export const orderStatuses = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
] as const
export type OrderStatus = (typeof orderStatuses)[number]

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
}

export const nextStatuses = (from: OrderStatus) => NEXT[from]
export const canTransition = (from: OrderStatus, to: OrderStatus) => NEXT[from].includes(to)

export type StockEffect = 'deduct' | 'restock' | null

// Stock leaves the shelf on CONFIRMED (not on placement) and comes back only if it left.
export const stockEffect = (to: OrderStatus, deducted: boolean): StockEffect => {
  if (to === 'CONFIRMED' && !deducted) return 'deduct'
  if ((to === 'CANCELLED' || to === 'RETURNED') && deducted) return 'restock'
  return null
}
