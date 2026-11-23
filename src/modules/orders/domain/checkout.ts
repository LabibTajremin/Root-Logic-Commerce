import { z } from 'zod'
import { normalizeBdPhone } from '@/modules/customers'

export type DeliveryZone = { id: string; label: string; charge: number }

const bdPhone = z
  .string()
  .transform(
    (p, ctx) =>
      normalizeBdPhone(p) ?? (ctx.addIssue({ code: 'custom', message: 'phone.invalid' }), z.NEVER),
  )

export const preferredTimes = ['any', 'morning', 'afternoon', 'evening'] as const

export const checkoutInput = z.object({
  name: z.string().trim().min(2).max(100),
  phone: bdPhone,
  // C6 extra fields (which ones show is a shop setting).
  altPhone: z
    .literal('')
    .transform(() => null)
    .or(bdPhone)
    .nullable()
    .default(null),
  preferredTime: z.enum(preferredTimes).default('any'),
  giftWrap: z.boolean().default(false),
  email: z.email().nullable().default(null),
  address: z.string().trim().min(5).max(300),
  area: z.string().trim().min(2).max(80),
  district: z.string().trim().min(2).max(80),
  note: z.string().trim().max(500).nullable().default(null),
  zoneId: z.string().min(1),
  // C2: an empty "Have a code?" box means none.
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .max(24)
    .transform((v) => v || null)
    .nullable()
    .default(null),
  paymentMethod: z.literal('COD').default('COD'),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        variantId: z.uuid().nullable().default(null),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1)
    .max(50),
})
export type CheckoutInput = z.input<typeof checkoutInput>

export const lineTotal = (l: { unitPrice: number; quantity: number }) => l.unitPrice * l.quantity

export const computeTotals = (
  lines: { unitPrice: number; quantity: number }[],
  deliveryCharge: number,
  discount: number,
) => {
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0)
  return { subtotal, deliveryCharge, discount, total: subtotal + deliveryCharge - discount }
}

/** How an order line reads everywhere: "Kurta (M / Red)" for a variant. */
export const lineName = (i: { name: string; variantLabel: string | null }) =>
  i.variantLabel ? `${i.name} (${i.variantLabel})` : i.name

type Item = { productId: string; variantId: string | null; quantity: number }
// Same product (and variant) twice in a cart becomes one line with the summed quantity.
export const mergeItems = (items: Item[]) => {
  const m = new Map<string, Item>()
  for (const i of items) {
    const key = `${i.productId}:${i.variantId}`
    m.set(key, { ...i, quantity: (m.get(key)?.quantity ?? 0) + i.quantity })
  }
  return [...m.values()]
}
