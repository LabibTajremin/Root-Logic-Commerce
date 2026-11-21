import { DomainError } from './errors'

const BN_DIGITS = '০১২৩৪৫৬৭৮৯'

// Money is always integer poisha (1 taka = 100) so totals never drift.
export const toMinor = (taka: number) => {
  if (!Number.isFinite(taka) || taka < 0) throw new DomainError('money.invalid', { value: taka })
  return Math.round(taka * 100)
}

export const toBanglaDigits = (s: string) => s.replace(/\d/g, (d) => BN_DIGITS[Number(d)]!)

export const formatMoney = (minor: number, opts: { banglaDigits?: boolean } = {}) => {
  const taka = minor / 100
  const s = taka.toLocaleString('en-IN', {
    minimumFractionDigits: minor % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  })
  return '৳' + (opts.banglaDigits ? toBanglaDigits(s) : s)
}
