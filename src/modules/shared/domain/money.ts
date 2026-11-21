import { DomainError } from './errors'

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'

/** Currencies an owner can show prices in; the sign is only how prices look. */
export const currencies = {
  BDT: { sign: '৳', group: 'en-IN' },
  INR: { sign: '₹', group: 'en-IN' },
  PKR: { sign: 'Rs', group: 'en-IN' },
  USD: { sign: '$', group: 'en-US' },
  EUR: { sign: '€', group: 'en-US' },
  GBP: { sign: '£', group: 'en-US' },
  AED: { sign: 'AED ', group: 'en-US' },
  SAR: { sign: 'SAR ', group: 'en-US' },
  MYR: { sign: 'RM', group: 'en-US' },
} as const
export type CurrencyCode = keyof typeof currencies
export const currencyCodes = Object.keys(currencies) as CurrencyCode[]

// Money is always integer minor units (1 taka = 100 poisha) so totals never drift.
export const toMinor = (taka: number) => {
  if (!Number.isFinite(taka) || taka < 0) throw new DomainError('money.invalid', { value: taka })
  return Math.round(taka * 100)
}

export const toBanglaDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]!)

export type MoneyFormat = { banglaDigits?: boolean; currency?: CurrencyCode }

export const formatMoney = (minor: number, opts: MoneyFormat = {}) => {
  const { sign, group } = currencies[opts.currency ?? 'BDT']
  const s = (minor / 100).toLocaleString(group, {
    minimumFractionDigits: minor % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })
  return sign + (opts.banglaDigits ? toBanglaDigits(s) : s)
}

export const dateFormats = ['d MMM yyyy', 'dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'] as const
export type DateFormat = (typeof dateFormats)[number]

const MONTHS = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  bn: ['জানু', 'ফেব্রু', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টে', 'অক্টো', 'নভে', 'ডিসে'],
}

/** A calendar date in the shop's format; Bangla shoppers (or Bangla-digit shops) get ০১২৩. */
export const formatDate = (
  date: Date,
  o: { format: DateFormat; locale: 'en' | 'bn'; banglaDigits?: boolean },
) => {
  // Bangladesh has one time zone; dates follow the shop's day, not the server's.
  const part = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  ) as Record<'year' | 'month' | 'day', string>
  const { year: y, month: m, day: d } = part
  const s = {
    'd MMM yyyy': `${Number(d)} ${MONTHS[o.locale][Number(m) - 1]} ${y}`,
    'dd/MM/yyyy': `${d}/${m}/${y}`,
    'MM/dd/yyyy': `${m}/${d}/${y}`,
    'yyyy-MM-dd': `${y}-${m}-${d}`,
  }[o.format]
  return o.banglaDigits || o.locale === 'bn' ? toBanglaDigits(s) : s
}
