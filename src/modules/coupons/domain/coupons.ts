import { z } from 'zod'

export const couponKinds = ['percent', 'fixed', 'free_shipping'] as const

/** C2: what the owner sets up. Codes are stored upper-case so shoppers can type any case. */
export const couponInput = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9-]{3,24}$/),
    kind: z.enum(couponKinds),
    // Percent 1–100, fixed in minor units; ignored for free shipping.
    value: z.number().int().nonnegative(),
    minSubtotal: z.number().int().nonnegative().default(0),
    productIds: z.array(z.uuid()).max(50).default([]),
    categoryIds: z.array(z.uuid()).max(50).default([]),
    startsAt: z.date().nullable().default(null),
    endsAt: z.date().nullable().default(null),
    totalLimit: z.number().int().positive().nullable().default(null),
    perPhoneLimit: z.number().int().positive().nullable().default(null),
    autoApply: z.boolean().default(false),
    active: z.boolean().default(true),
  })
  .refine((c) => c.kind !== 'percent' || (c.value >= 1 && c.value <= 100), { path: ['value'] })
  .refine((c) => c.kind !== 'fixed' || c.value >= 1, { path: ['value'] })
  .refine((c) => !c.startsAt || !c.endsAt || c.startsAt < c.endsAt, { path: ['endsAt'] })
export type CouponInput = z.input<typeof couponInput>
export type Coupon = z.output<typeof couponInput> & { id: string; used: number }

type Line = { productId: string; categoryId: string | null; amount: number }
export type CouponResult =
  { ok: true; discount: number; freeShipping: boolean } | { ok: false; reason: string }

/** Is the code usable for this cart right now, and how much does it take off? */
export const applyCoupon = (
  c: Coupon,
  ctx: { lines: Line[]; delivery: number; now: Date; usedByPhone: number },
): CouponResult => {
  const fail = (reason: string) => ({ ok: false as const, reason: `coupon.${reason}` })
  if (!c.active) return fail('invalid')
  if (c.startsAt && ctx.now < c.startsAt) return fail('not_started')
  if (c.endsAt && ctx.now > c.endsAt) return fail('expired')
  if (c.totalLimit !== null && c.used >= c.totalLimit) return fail('used_up')
  if (c.perPhoneLimit !== null && ctx.usedByPhone >= c.perPhoneLimit) return fail('phone_limit')
  const scoped = c.productIds.length > 0 || c.categoryIds.length > 0
  const eligible = ctx.lines.filter(
    (l) =>
      !scoped ||
      c.productIds.includes(l.productId) ||
      (l.categoryId !== null && c.categoryIds.includes(l.categoryId)),
  )
  const base = eligible.reduce((s, l) => s + l.amount, 0)
  if (base === 0) return fail('not_applicable')
  if (ctx.lines.reduce((s, l) => s + l.amount, 0) < c.minSubtotal) return fail('min_subtotal')
  if (c.kind === 'free_shipping') return { ok: true, discount: ctx.delivery, freeShipping: true }
  const off = c.kind === 'percent' ? Math.round((base * c.value) / 100) : c.value
  return { ok: true, discount: Math.min(off, base), freeShipping: false }
}
