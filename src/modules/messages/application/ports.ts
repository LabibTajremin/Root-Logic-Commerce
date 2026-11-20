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

export type Send = (channel: OtpChannel, to: string, text: string) => Promise<void>
