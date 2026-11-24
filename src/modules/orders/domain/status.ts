import { DomainError } from '@/modules/shared'

/** C15: where an order came from (tag + filter in admin). */
export const orderSources = ['web', 'landing', 'chat', 'voice', 'pos', 'manual', 'import'] as const
export type OrderSource = (typeof orderSources)[number]

export const orderStatuses = [
  'PENDING',
  'ON_HOLD',
  'SCHEDULED',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'COURIER_HOLD',
  'PARTIAL_DELIVERED',
  'DELIVERED',
  'RETURNING',
  'RETURN_RECEIVED',
  'RETURN_MISSING',
  'CANCELLED',
  'RETURNED',
] as const
export type OrderStatus = (typeof orderStatuses)[number]

// C13: RETURNING is a parcel the courier is bringing back; RETURNED is a customer return.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'ON_HOLD', 'SCHEDULED', 'CANCELLED'],
  ON_HOLD: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  SCHEDULED: ['PENDING', 'CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'ON_HOLD', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'PARTIAL_DELIVERED', 'COURIER_HOLD', 'RETURNING', 'CANCELLED'],
  COURIER_HOLD: ['SHIPPED', 'DELIVERED', 'RETURNING'],
  PARTIAL_DELIVERED: [],
  DELIVERED: ['RETURNED'],
  RETURNING: ['RETURN_RECEIVED', 'RETURN_MISSING'],
  RETURN_MISSING: ['RETURN_RECEIVED'],
  RETURN_RECEIVED: [],
  CANCELLED: [],
  RETURNED: [],
}

export const nextStatuses = (from: OrderStatus) => NEXT[from]
export const canTransition = (from: OrderStatus, to: OrderStatus) => NEXT[from].includes(to)

/** Orders in these states are not sales (no revenue, not on the dashboard). */
export const lostStatuses = [
  'CANCELLED',
  'RETURNED',
  'RETURNING',
  'RETURN_RECEIVED',
  'RETURN_MISSING',
] as const satisfies OrderStatus[]

export type StockEffect = 'deduct' | 'restock' | 'partial' | null

/**
 * Stock leaves the shelf on CONFIRMED (not on placement) and comes back only if it left:
 * all of it on cancel, customer return or a received courier return (not while RETURNING
 * or when the return goes missing); only the undelivered lines on a partial delivery.
 */
export const stockEffect = (to: OrderStatus, deducted: boolean): StockEffect => {
  if (to === 'CONFIRMED' && !deducted) return 'deduct'
  if (!deducted) return null
  if (to === 'CANCELLED' || to === 'RETURNED' || to === 'RETURN_RECEIVED') return 'restock'
  return to === 'PARTIAL_DELIVERED' ? 'partial' : null
}

/** C13 partial delivery: what goes back on the shelf, from the delivered count per line. */
export const undelivered = (
  items: { id: string; quantity: number }[],
  delivered: Record<string, number>,
) => {
  const back = items.map((i) => ({ itemId: i.id, quantity: i.quantity - (delivered[i.id] ?? 0) }))
  const ok = back.every(
    (b, n) => Number.isInteger(b.quantity) && b.quantity >= 0 && b.quantity <= items[n]!.quantity,
  )
  const left = back.reduce((s, b) => s + b.quantity, 0)
  const total = items.reduce((s, i) => s + i.quantity, 0)
  // Something must have been delivered and something must be coming back.
  if (!ok || left === 0 || left === total) throw new DomainError('order.partial_invalid')
  return back.filter((b) => b.quantity > 0)
}

/** C21: a courier return not received after this many days is marked missing. */
export const returnMissingDays = 14
