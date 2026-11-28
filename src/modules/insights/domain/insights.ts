import { DomainError } from '@/modules/shared'

export const rangeKeys = ['today', '7d', '30d', '12m', 'custom'] as const
export type RangeKey = (typeof rangeKeys)[number]
export const groups = ['day', 'week', 'month', 'year'] as const
export type Group = (typeof groups)[number]

const DAY = 86_400_000
const ISO = /^\d{4}-\d{2}-\d{2}$/

/** Calendar date in Bangladesh (UTC+6, no daylight saving) — stats roll over at local midnight. */
export const dhakaDate = (d: Date) =>
  new Date(d.getTime() + 6 * 3_600_000).toISOString().slice(0, 10)
export const addDays = (date: string, n: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10)
const span = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / DAY + 1

export type Range = { from: string; to: string; group: Group }

export const resolveRange = (
  key: RangeKey,
  now: Date,
  custom: { from?: string; to?: string; group?: string } = {},
): Range => {
  const to = dhakaDate(now)
  const back = { today: 0, '7d': 6, '30d': 29, '12m': 364 }
  if (key !== 'custom')
    return { from: addDays(to, -back[key]), to, group: key === '12m' ? 'month' : 'day' }
  const { from = '', to: end = '' } = custom
  if (!ISO.test(from) || !ISO.test(end) || from > end || span(from, end) > 731)
    throw new DomainError('insights.range')
  const n = span(from, end)
  const group =
    groups.find((g) => g === custom.group) ?? (n <= 31 ? 'day' : n <= 180 ? 'week' : 'month')
  return { from, to: end, group }
}

/** Bucket key for a date: the day, the Monday of its week, YYYY-MM or YYYY. */
export const bucketOf = (date: string, g: Group) => {
  if (g === 'day') return date
  if (g === 'month') return date.slice(0, 7)
  if (g === 'year') return date.slice(0, 4)
  const weekday = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7
  return addDays(date, -weekday)
}

export type DayStats = {
  date: string
  visitors: number
  pageViews: number
  ordersPlaced: number
  ordersConfirmed: number
  ordersDelivered: number
  ordersCancelled: number
  ordersReturned: number
  revenue: number
  cost: number
}
type Totals = Omit<DayStats, 'date'>
const ZERO: Totals = {
  visitors: 0,
  pageViews: 0,
  ordersPlaced: 0,
  ordersConfirmed: 0,
  ordersDelivered: 0,
  ordersCancelled: 0,
  ordersReturned: 0,
  revenue: 0,
  cost: 0,
}
const add = (a: Totals, b: Totals): Totals =>
  Object.fromEntries(
    Object.keys(ZERO).map((k) => [k, a[k as keyof Totals] + b[k as keyof Totals]]),
  ) as Totals

/** Totals plus the derived metrics (profit, average order value, conversion). */
export const summarize = (rows: DayStats[]) => {
  const t = rows.reduce<Totals>((s, r) => add(s, r), ZERO)
  return {
    ...t,
    grossProfit: t.revenue - t.cost,
    aov: t.ordersDelivered ? Math.round(t.revenue / t.ordersDelivered) : 0,
    conversion: t.visitors ? t.ordersPlaced / t.visitors : 0,
  }
}

/** One point per bucket across the whole range, zeros where nothing happened. */
export const series = (rows: DayStats[], r: Range) => {
  const out = new Map<string, Totals>()
  for (let d = r.from; d <= r.to; d = addDays(d, 1)) out.set(bucketOf(d, r.group), ZERO)
  for (const row of rows) {
    const k = bucketOf(row.date, r.group)
    out.set(k, add(out.get(k)!, row))
  }
  return [...out].map(([bucket, t]) => ({ bucket, ...t }))
}
