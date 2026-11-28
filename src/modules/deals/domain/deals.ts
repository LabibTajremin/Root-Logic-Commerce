import { z } from 'zod'
import type { Combo, FlashSale } from './pricing'

const money = z.number().int().positive()

/** A9: a bundle of plain products at one price. */
export const comboSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{1,60}$/),
  on: z.boolean().default(true),
  items: z
    .array(z.object({ productId: z.uuid(), qty: z.number().int().min(1).max(10) }))
    .min(2)
    .max(6)
    .refine((xs) => new Set(xs.map((x) => x.productId)).size === xs.length),
  price: money,
}) satisfies z.ZodType<Combo, unknown>

/** B11: one sale at a time — a window, its products and an optional per-product cap. */
export const flashSaleSchema = z
  .object({
    on: z.boolean().default(true),
    name: z.string().trim().min(1).max(60),
    startsAt: z.coerce.date(),
    endsAt: z.coerce.date(),
    cap: z.number().int().positive().nullable().default(null),
    items: z
      .array(
        z
          .object({
            productId: z.uuid(),
            price: money.nullable().default(null),
            percent: z.number().int().min(1).max(90).nullable().default(null),
          })
          // Each product is on sale by a price or by a percentage, never both.
          .refine((i) => (i.price === null) !== (i.percent === null)),
      )
      .max(24),
  })
  .refine((s) => s.endsAt > s.startsAt, { path: ['endsAt'] }) satisfies z.ZodType<
  FlashSale,
  unknown
>
