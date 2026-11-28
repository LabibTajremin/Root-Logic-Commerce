import type { OtpChannel } from '../domain/otp'

export type OtpRow = {
  id: string
  target: string
  codeHash: string
  attempts: number
  expiresAt: Date
  consumedAt: Date | null
}

export type OtpRepo = {
  countSince(storeId: string, target: string, since: Date): Promise<number>
  insert(storeId: string, row: { target: string; codeHash: string; expiresAt: Date }): Promise<void>
  /** Most recent code for this target, consumed or not. */
  latest(storeId: string, target: string): Promise<OtpRow | null>
  bumpAttempts(id: string): Promise<void>
  consume(id: string): Promise<void>
}

export type Send = (channel: OtpChannel | 'whatsapp', to: string, text: string) => Promise<void>

export type OutboxChannel = 'email' | 'sms' | 'whatsapp'
export type OutboxRow = {
  id: string
  storeId: string
  channel: OutboxChannel
  recipient: string
  body: string
  attempts: number
}
export type OutboxRepo = {
  /** Ignored when the dedupe key was queued before (an event retried never double-sends). */
  enqueue(
    storeId: string,
    m: { channel: OutboxChannel; recipient: string; body: string; dedupeKey: string },
  ): Promise<void>
  /** Claims due pending rows (pushes their next attempt out so a parallel worker skips them). */
  claimDue(now: Date, limit: number): Promise<OutboxRow[]>
  markSent(id: string): Promise<void>
  markRetry(id: string, attempts: number, nextAttemptAt: Date, error: string): Promise<void>
  markFailed(id: string, attempts: number, error: string): Promise<void>
  templates(storeId: string): Promise<SavedTemplateRow[]>
  saveTemplate(storeId: string, t: SavedTemplateRow): Promise<void>
  recent(
    storeId: string,
    limit: number,
  ): Promise<(OutboxRow & { status: string; lastError: string | null; createdAt: Date })[]>
}
export type SavedTemplateRow = {
  event: string
  channel: 'email' | 'sms'
  locale: 'en' | 'bn'
  body: string
  enabled: boolean
}

/** What a message about an order needs to know, resolved by the composition root. */
export type OrderFacts = {
  orderNo: number
  total: string
  name: string
  phone: string
  email: string | null
}
export type StoreFacts = {
  name: string
  locale: 'en' | 'bn'
  channels: Record<OutboxChannel, boolean>
  ownerPhone: string
  ownerEmail: string
}
export type Deliver = (
  storeId: string,
  channel: OutboxChannel,
  to: string,
  text: string,
) => Promise<void>
