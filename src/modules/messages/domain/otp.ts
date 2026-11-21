import { normalizeBdPhone } from '@/modules/customers'
import { DomainError } from '@/modules/shared'

export const OTP_TTL_MS = 10 * 60_000
export const OTP_WINDOW_MS = 60 * 60_000
export const OTP_MAX_PER_WINDOW = 5
export const OTP_MAX_ATTEMPTS = 5

export type OtpChannel = 'sms' | 'email'
export type OtpSettings = { sms: boolean; email: boolean }

/** Which channel verifies this checkout, if any. SMS wins: every order has a phone. */
export const otpTarget = (s: OtpSettings, c: { phone: string; email: string | null }) => {
  if (s.sms) {
    const phone = normalizeBdPhone(c.phone)
    if (!phone) throw new DomainError('validation')
    return { channel: 'sms' as const, target: phone }
  }
  if (s.email) {
    if (!c.email) throw new DomainError('otp.email_required')
    return { channel: 'email' as const, target: c.email.trim().toLowerCase() }
  }
  return null
}

// Shown back to the shopper: enough to recognise, not enough to harvest.
export const maskTarget = (t: string) =>
  t.includes('@') ? `${t[0]}***${t.slice(t.indexOf('@'))}` : `•••••••${t.slice(-3)}`
