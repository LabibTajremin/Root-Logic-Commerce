import { describe, expect, it } from 'vitest'
import { subscription } from './newsletter'

describe('newsletter sign-up (B13)', () => {
  it('takes a BD mobile or an email, only with consent', () => {
    expect(subscription('01712-345678', true)).toEqual({ contact: '01712345678', kind: 'phone' })
    expect(subscription(' Rahim@Mail.COM ', true)).toEqual({
      contact: 'rahim@mail.com',
      kind: 'email',
    })
    expect(() => subscription('01712345678', false)).toThrow('newsletter.consent')
    expect(() => subscription('not a contact', true)).toThrow('newsletter.contact')
  })
})
