import { DomainError } from '@/modules/shared'
import {
  maskTarget,
  OTP_MAX_ATTEMPTS,
  OTP_MAX_PER_WINDOW,
  OTP_TTL_MS,
  OTP_WINDOW_MS,
  type OtpChannel,
} from '../domain/otp'
import type { Deliver, OtpRepo } from './ports'

type Deps = {
  repo: OtpRepo
  send: Deliver
  hash: (s: string) => string
  code: () => string
  now: () => Date
}

export const createOtp = ({ repo, send, hash, code, now }: Deps) => {
  // Bound to store + target so a code can never be replayed for another shopper.
  const digest = (storeId: string, target: string, c: string) => hash(`${storeId}:${target}:${c}`)
  return {
    /** Sends a fresh code; returns the masked target to show the shopper. */
    async request(storeId: string, channel: OtpChannel, target: string, storeName: string) {
      const t = now().getTime()
      const recent = await repo.countSince(storeId, target, new Date(t - OTP_WINDOW_MS))
      if (recent >= OTP_MAX_PER_WINDOW) throw new DomainError('otp.limited')
      const c = code()
      await repo.insert(storeId, {
        target,
        codeHash: digest(storeId, target, c),
        expiresAt: new Date(t + OTP_TTL_MS),
      })
      await send(storeId, channel, target, `${storeName}: your code is ${c} / আপনার কোড ${c}`)
      return maskTarget(target)
    },

    async verify(storeId: string, target: string, input: string) {
      const row = await repo.latest(storeId, target)
      if (!row || row.consumedAt || row.expiresAt <= now() || row.attempts >= OTP_MAX_ATTEMPTS)
        throw new DomainError('otp.expired')
      if (row.codeHash !== digest(storeId, target, input.trim())) {
        await repo.bumpAttempts(row.id)
        throw new DomainError('otp.invalid')
      }
      await repo.consume(row.id)
    },
  }
}

export type Otp = ReturnType<typeof createOtp>
