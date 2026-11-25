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

/** D2: a phone's finished courier deliveries (cancellations before shipping don't count). */
export type CourierHistory = { total: number; delivered: number; returned: number }
export const noHistory: CourierHistory = { total: 0, delivered: 0, returned: 0 }

export const successPct = (h: CourierHistory) =>
  h.total === 0 ? null : Math.round((h.delivered / h.total) * 100)

/** D2: below `minPct` (0 = off) with at least `minOrders` finished, hold the order or ask for a code. */
export type ScoreRule = { minPct: number; minOrders: number; action: 'hold' | 'otp' }

export const scoreAction = (h: CourierHistory, r: ScoreRule) =>
  r.minPct > 0 && h.total >= r.minOrders && (successPct(h) ?? 100) < r.minPct ? r.action : null

/** D2: under this success % a phone's record is shown as a warning. */
export const riskyScore = (pct: number | null) => pct !== null && pct < 60
