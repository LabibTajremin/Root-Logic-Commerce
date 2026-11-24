import type { OrderStatus } from '@/modules/orders'

export const TONE = {
  PENDING: 'warning',
  ON_HOLD: 'neutral',
  SCHEDULED: 'neutral',
  CONFIRMED: 'accent',
  PROCESSING: 'accent',
  SHIPPED: 'warning',
  COURIER_HOLD: 'warning',
  PARTIAL_DELIVERED: 'success',
  DELIVERED: 'success',
  RETURNING: 'danger',
  RETURN_RECEIVED: 'neutral',
  RETURN_MISSING: 'danger',
  CANCELLED: 'danger',
  RETURNED: 'neutral',
} as const satisfies Record<OrderStatus, string>
