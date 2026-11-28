import { describe, expect, it } from 'vitest'
import {
  backoffMs,
  MAX_ATTEMPTS,
  messageEvents,
  render,
  templateFor,
  defaultTemplates,
} from './templates'

describe('message templates', () => {
  it('has EN and BN defaults for every event and both variants', () => {
    for (const e of messageEvents)
      for (const l of ['en', 'bn'] as const) {
        expect(defaultTemplates[e][l].short).toContain('{{orderNo}}')
        expect(defaultTemplates[e][l].email.length).toBeGreaterThan(10)
      }
  })

  it('renders {{vars}} and leaves unknown ones blank', () => {
    expect(
      render('Hi {{name}}, order #{{orderNo}} {{nope}}!', { name: 'Rahim', orderNo: 1001 }),
    ).toBe('Hi Rahim, order #1001 !')
  })

  it('uses the owner’s template when set, else the default; email has its own variant', () => {
    const saved = [
      {
        event: 'order.placed',
        channel: 'sms',
        locale: 'en',
        body: 'Custom {{orderNo}}',
        enabled: true,
      },
    ]
    expect(templateFor(saved, 'order.placed', 'sms', 'en')).toEqual({
      body: 'Custom {{orderNo}}',
      enabled: true,
    })
    expect(templateFor(saved, 'order.placed', 'whatsapp', 'en')).toEqual({
      body: 'Custom {{orderNo}}',
      enabled: true,
    })
    expect(templateFor(saved, 'order.placed', 'email', 'bn')).toEqual({
      body: defaultTemplates['order.placed'].bn.email,
      enabled: true,
    })
    expect(
      templateFor([{ ...saved[0]!, enabled: false }], 'order.placed', 'sms', 'en').enabled,
    ).toBe(false)
  })

  it('backs off exponentially up to six hours', () => {
    expect(backoffMs(1)).toBe(60_000)
    expect(backoffMs(3)).toBe(4 * 60_000)
    expect(backoffMs(20)).toBe(6 * 3600_000)
    expect(MAX_ATTEMPTS).toBe(8)
  })
})
