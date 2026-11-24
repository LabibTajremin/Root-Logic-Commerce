import { z } from 'zod'
import { normalizeBdPhone } from '@/modules/customers'

export const blockKinds = ['phone', 'ip', 'device'] as const
export type BlockKind = (typeof blockKinds)[number]

/** D3: what an owner blocks; phones are stored normalized so any spelling matches. */
export const blockInput = z
  .object({
    kind: z.enum(blockKinds),
    value: z.string().trim().min(1).max(100),
    note: z.string().trim().max(200).default(''),
  })
  .transform((b, ctx) => {
    if (b.kind !== 'phone') return b
    const value = normalizeBdPhone(b.value)
    if (!value) return (ctx.addIssue({ code: 'custom', message: 'phone.invalid' }), z.NEVER)
    return { ...b, value }
  })
export type BlockInput = z.input<typeof blockInput>

/** D1/D4: the shop's order guard settings. */
export type FraudRules = {
  /** Orders allowed per phone, IP or device within the window (0 = no limit). */
  perWindow: number
  windowHours: number
  /** Same phone + an overlapping product within this many hours counts as a duplicate. */
  duplicateHours: number
  blockDuplicates: boolean
}

export const attemptReasons = ['blocked', 'too_many', 'duplicate'] as const
export type AttemptReason = (typeof attemptReasons)[number]
