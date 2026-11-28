import { DomainError } from '@/modules/shared'
import { normalizeBdPhone } from '@/modules/customers'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** B13: a Bangladeshi mobile number or an email, with the shopper's consent. */
export const subscription = (contact: string, consent: boolean) => {
  if (!consent) throw new DomainError('newsletter.consent')
  const phone = normalizeBdPhone(contact)
  if (phone) return { contact: phone, kind: 'phone' as const }
  const email = contact.trim().toLowerCase()
  if (EMAIL.test(email)) return { contact: email, kind: 'email' as const }
  throw new DomainError('newsletter.contact')
}
