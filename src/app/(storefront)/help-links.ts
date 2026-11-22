import type { HelpLink } from './help-bubble'

type Contact = { phone: string; whatsapp: string; messenger: string }

const digits = (s: string) => s.replace(/\D/g, '')
// Bangladeshi numbers are usually typed locally (01…); WhatsApp needs the country code.
const intl = (s: string) => (digits(s).startsWith('0') ? `88${digits(s)}` : digits(s))

/** The help bubble's channels: only those the owner filled in, in the order shoppers prefer. */
export const helpLinks = (c: Contact, t: (k: string) => string): HelpLink[] =>
  [
    c.whatsapp && { href: `https://wa.me/${intl(c.whatsapp)}`, label: t('shop.helpWhatsapp') },
    c.messenger && { href: `https://m.me/${c.messenger}`, label: t('shop.helpMessenger') },
    c.phone && { href: `tel:${c.phone.replace(/\s/g, '')}`, label: t('shop.helpCall') },
  ].filter((l): l is HelpLink => Boolean(l))
