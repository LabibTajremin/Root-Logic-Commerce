const DAY = 86_400_000

export const daysAgo = (days: number, now: Date = new Date()) =>
  new Date(now.getTime() - days * DAY)

const STEPS = [
  [60, 'second'],
  [3600, 'minute'],
  [86_400, 'hour'],
  [Infinity, 'day'],
] as const
const SIZE = { second: 1, minute: 60, hour: 3600, day: 86_400 }

/** B7: "2 hours ago" / "২ ঘণ্টা আগে" in the shopper's language. */
export const timeAgo = (at: Date, now: Date, locale: string) => {
  const s = Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000))
  const [, unit] = STEPS.find(([limit]) => s < limit)!
  return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
    -Math.floor(s / SIZE[unit]),
    unit,
  )
}
