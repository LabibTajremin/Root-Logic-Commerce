import { z } from 'zod'
import { normalizeBdPhone } from '@/modules/customers'

/** C1: drafts older than this are purged (and never shown). */
export const draftMaxAgeDays = 30

const text = (max: number) => z.string().trim().max(max).default('')

export const draftInput = z.object({
  phone: z
    .string()
    .transform(
      (p, ctx) =>
        normalizeBdPhone(p) ??
        (ctx.addIssue({ code: 'custom', message: 'phone.invalid' }), z.NEVER),
    ),
  name: text(100),
  email: text(200),
  district: text(80),
  area: text(80),
  address: text(300),
  note: text(500),
  zoneId: text(100),
  items: z
    .array(
      z.object({
        productId: z.uuid(),
        variantId: z.uuid().nullable().default(null),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .max(50)
    .default([]),
})
export type DraftInput = z.input<typeof draftInput>
export type DraftData = z.output<typeof draftInput>

/** What converting a draft places: the shop fills any gaps before converting. */
export const draftCheckout = (d: DraftData) => ({
  name: d.name,
  phone: d.phone,
  email: d.email || null,
  district: d.district,
  area: d.area,
  address: d.address,
  note: d.note || null,
  zoneId: d.zoneId,
  items: d.items,
})
