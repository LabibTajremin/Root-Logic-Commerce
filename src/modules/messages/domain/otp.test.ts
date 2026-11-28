import { describe, expect, it } from 'vitest'
import { maskTarget, otpTarget } from './otp'

describe('otp target', () => {
  const contact = { phone: '+880 1712-345678', email: 'Rahim@Example.com' }
  it('prefers SMS, then email, else none', () => {
    expect(otpTarget({ sms: true, email: true }, contact)).toEqual({
      channel: 'sms',
      target: '01712345678',
    })
    expect(otpTarget({ sms: false, email: true }, contact)).toEqual({
      channel: 'email',
      target: 'rahim@example.com',
    })
    expect(otpTarget({ sms: false, email: false }, contact)).toBeNull()
  })
  it('needs a valid phone for SMS and an email for email codes', () => {
    expect(() => otpTarget({ sms: true, email: false }, { phone: '123', email: null })).toThrow(
      'validation',
    )
    expect(() =>
      otpTarget({ sms: false, email: true }, { phone: '01712345678', email: null }),
    ).toThrow('otp.email_required')
  })
  it('masks targets', () => {
    expect(maskTarget('01712345678')).toBe('•••••••678')
    expect(maskTarget('rahim@example.com')).toBe('r***@example.com')
  })
})
