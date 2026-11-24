import { z } from 'zod'
import { DomainError } from '@/modules/shared'

export const returnReasons = ['damaged', 'wrong_item', 'size', 'not_needed', 'other'] as const

/** C14: what came back (or is being swapped), why, and any money given back. */
export const returnInput = z.object({
  kind: z.enum(['return', 'exchange']),
  reason: z.enum(returnReasons),
  note: z.string().trim().max(500).default(''),
  items: z
    .array(z.object({ itemId: z.uuid(), quantity: z.number().int().min(1).max(99) }))
    .min(1)
    .max(50),
  /** Minor units given back to the customer (0 = none). */
  refund: z.number().int().nonnegative().default(0),
  refundMethod: z.string().trim().max(60).default(''),
  /** Put the returned units back on the shelf. */
  restock: z.boolean().default(false),
  /** The replacement order (an exchange), by its number. */
  exchangeOrderNo: z.number().int().positive().nullable().default(null),
})
export type ReturnInput = z.input<typeof returnInput>

/** Lines can't come back more times than they were bought; refunds can't pass the total. */
export const checkReturn = (
  order: { total: number; items: { id: string; quantity: number }[] },
  previous: { items: { itemId: string; quantity: number }[]; refund: number }[],
  r: { items: { itemId: string; quantity: number }[]; refund: number },
) => {
  const back = new Map<string, number>()
  for (const i of [...previous.flatMap((p) => p.items), ...r.items])
    back.set(i.itemId, (back.get(i.itemId) ?? 0) + i.quantity)
  const bought = new Map(order.items.map((i) => [i.id, i.quantity]))
  for (const [id, n] of back)
    if (n > (bought.get(id) ?? 0)) throw new DomainError('return.too_many', { itemId: id })
  const refunded = previous.reduce((s, p) => s + p.refund, 0) + r.refund
  if (refunded > order.total) throw new DomainError('return.refund_too_big')
}
