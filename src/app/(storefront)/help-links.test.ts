import { describe, expect, it } from 'vitest'
import { helpLinks } from './help-links'

const t = (k: string) => k
const all = { whatsapp: true, messenger: true, call: true }
const full = { phone: '01711 234567', whatsapp: '01711-234567', messenger: 'ankito.bd' }

describe('help bubble links (B9)', () => {
  it('lists only filled-in channels, WhatsApp with the country code', () => {
    expect(helpLinks({ phone: '', whatsapp: '', messenger: '' }, all, t)).toEqual([])
    expect(helpLinks(full, all, t)).toEqual([
      { href: 'https://wa.me/8801711234567', label: 'shop.helpWhatsapp' },
      { href: 'https://m.me/ankito.bd', label: 'shop.helpMessenger' },
      { href: 'tel:01711234567', label: 'shop.helpCall' },
    ])
    expect(
      helpLinks({ phone: '', whatsapp: '+8801711234567', messenger: '' }, all, t)[0]!.href,
    ).toBe('https://wa.me/8801711234567')
  })

  it('leaves out channels the owner switched off in the design editor', () => {
    expect(helpLinks(full, { whatsapp: false, messenger: true, call: false }, t)).toEqual([
      { href: 'https://m.me/ankito.bd', label: 'shop.helpMessenger' },
    ])
  })
})
