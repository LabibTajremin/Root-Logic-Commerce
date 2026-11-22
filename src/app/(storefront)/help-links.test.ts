import { describe, expect, it } from 'vitest'
import { helpLinks } from './help-links'

const t = (k: string) => k

describe('help bubble links (B9)', () => {
  it('lists only filled-in channels, WhatsApp with the country code', () => {
    expect(helpLinks({ phone: '', whatsapp: '', messenger: '' }, t)).toEqual([])
    expect(
      helpLinks({ phone: '01711 234567', whatsapp: '01711-234567', messenger: 'ankito.bd' }, t),
    ).toEqual([
      { href: 'https://wa.me/8801711234567', label: 'shop.helpWhatsapp' },
      { href: 'https://m.me/ankito.bd', label: 'shop.helpMessenger' },
      { href: 'tel:01711234567', label: 'shop.helpCall' },
    ])
    expect(helpLinks({ phone: '', whatsapp: '+8801711234567', messenger: '' }, t)[0]!.href).toBe(
      'https://wa.me/8801711234567',
    )
  })
})
