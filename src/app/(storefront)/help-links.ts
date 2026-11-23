import type { HelpLink } from './help-bubble'

type Contact = { phone: string; whatsapp: string; messenger: string }
type Channels = { whatsapp: boolean; messenger: boolean; call: boolean }

const digits = (s: string) => s.replace(/\D/g, '')
// Bangladeshi numbers are usually typed locally (01…); WhatsApp needs the country code.
const intl = (s: string) => (digits(s).startsWith('0') ? `88${digits(s)}` : digits(s))

/** The help bubble's channels: filled in and switched on, in the order shoppers prefer. */
export const helpLinks = (c: Contact, on: Channels, t: (k: string) => string): HelpLink[] =>
  [
    on.whatsapp &&
      c.whatsapp && { href: `https://wa.me/${intl(c.whatsapp)}`, label: t('shop.helpWhatsapp') },
    on.messenger &&
      c.messenger && { href: `https://m.me/${c.messenger}`, label: t('shop.helpMessenger') },
    on.call && c.phone && { href: `tel:${c.phone.replace(/\s/g, '')}`, label: t('shop.helpCall') },
  ].filter((l): l is HelpLink => Boolean(l))
