import { z } from 'zod'
import type { OrderStatus } from '@/modules/orders'

export const courierProviders = ['steadfast', 'pathao', 'redx'] as const
export type CourierProvider = (typeof courierProviders)[number]

const field = z.string().trim().min(1).max(200)

/** E1: what each courier's merchant API needs; sealed before it is stored. */
export const credentialSchemas = {
  steadfast: z.object({ apiKey: field, secretKey: field }),
  pathao: z.object({
    clientId: field,
    clientSecret: field,
    username: field,
    password: field,
    storeId: z.string().trim().regex(/^\d+$/, 'courier.store_id'),
  }),
  redx: z.object({ token: field }),
} satisfies Record<CourierProvider, z.ZodType>
export type Credentials = {
  [P in CourierProvider]: z.infer<(typeof credentialSchemas)[P]>
}

export const credentialFields = {
  steadfast: ['apiKey', 'secretKey'],
  pathao: ['clientId', 'clientSecret', 'username', 'password', 'storeId'],
  redx: ['token'],
} as const satisfies { [P in CourierProvider]: (keyof Credentials[P])[] }

export const accountInput = z.object({
  provider: z.enum(courierProviders),
  label: z.string().trim().min(1).max(60),
  credentials: z.record(z.string(), z.string()),
})
export type AccountInput = z.input<typeof accountInput>

/** One vocabulary for every courier's own status words. */
export const parcelStates = [
  'pending',
  'in_transit',
  'hold',
  'delivered',
  'partial',
  'returning',
  'cancelled',
] as const
export type ParcelState = (typeof parcelStates)[number]

const RAW: Record<CourierProvider, Record<string, ParcelState>> = {
  steadfast: {
    pending: 'pending',
    in_review: 'pending',
    hold: 'hold',
    delivered_approval_pending: 'delivered',
    delivered: 'delivered',
    partial_delivered_approval_pending: 'partial',
    partial_delivered: 'partial',
    cancelled_approval_pending: 'returning',
    cancelled: 'returning',
  },
  pathao: {
    pending: 'pending',
    pickup_requested: 'pending',
    assigned_for_pickup: 'pending',
    picked: 'in_transit',
    at_the_sorting_hub: 'in_transit',
    in_transit: 'in_transit',
    received_at_last_mile_hub: 'in_transit',
    assigned_for_delivery: 'in_transit',
    delivered: 'delivered',
    partial_delivery: 'partial',
    hold: 'hold',
    on_hold: 'hold',
    return: 'returning',
    returned: 'returning',
    paid_return: 'returning',
    pickup_cancelled: 'cancelled',
    delivery_failed: 'hold',
  },
  redx: {
    'pickup-pending': 'pending',
    'ready-for-delivery': 'in_transit',
    'delivery-in-progress': 'in_transit',
    'agent-area-change': 'in_transit',
    delivered: 'delivered',
    'partially-delivered': 'partial',
    'agent-hold': 'hold',
    'agent-returning': 'returning',
    returned: 'returning',
    cancelled: 'cancelled',
  },
}

const key = (raw: string) =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '_')

/** E2: a courier's raw status → our state; unknown words count as still moving. */
export const parcelState = (provider: CourierProvider, raw: string): ParcelState => {
  const k = key(raw)
  return RAW[provider][provider === 'redx' ? k.replace(/_/g, '-') : k] ?? 'in_transit'
}

/** The order status a parcel state moves the order to (partial needs counts from the owner). */
export const orderStatusFor = (s: ParcelState): OrderStatus | null =>
  (
    ({
      in_transit: 'SHIPPED',
      hold: 'COURIER_HOLD',
      delivered: 'DELIVERED',
      returning: 'RETURNING',
      cancelled: 'RETURNING',
    }) as Partial<Record<ParcelState, OrderStatus>>
  )[s] ?? null

/** States that no longer change: the parcel is done or back with the shop. */
export const finalStates: ParcelState[] = ['delivered', 'partial', 'returning', 'cancelled']

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')

/** E2: the parcel reference and raw status inside a courier's webhook body (null = not a status update). */
export const readWebhook = (
  provider: CourierProvider,
  body: unknown,
): { ref: string; raw: string; charge: number | null } | null => {
  if (typeof body !== 'object' || body === null) return null
  const b = body as Record<string, unknown>
  const money = (v: unknown) =>
    str(v) && Number.isFinite(Number(v)) ? Math.round(Number(v) * 100) : null
  const pick = {
    steadfast: () => ({
      ref: str(b.consignment_id),
      raw: str(b.status),
      charge: money(b.delivery_charge),
    }),
    pathao: () => ({
      ref: str(b.consignment_id),
      raw: str(b.order_status ?? b.event).replace(/^order\./, ''),
      charge: money(b.delivery_fee),
    }),
    redx: () => ({ ref: str(b.tracking_number), raw: str(b.status), charge: null }),
  }[provider]()
  return pick.ref && pick.raw ? pick : null
}
