import { describe, expect, it } from 'vitest'
import {
  addDays,
  bucketOf,
  dhakaDate,
  resolveRange,
  series,
  summarize,
  type DayStats,
} from './insights'

const now = new Date('2026-03-10T20:00:00Z') // 02:00 on 11 March in Dhaka
const day = (date: string, o: Partial<DayStats> = {}): DayStats => ({
  date,
  visitors: 0,
  pageViews: 0,
  ordersPlaced: 0,
  ordersConfirmed: 0,
  ordersDelivered: 0,
  ordersCancelled: 0,
  ordersReturned: 0,
  revenue: 0,
  cost: 0,
  ...o,
})

describe('insights', () => {
  it('uses Dhaka calendar days', () => {
    expect(dhakaDate(now)).toBe('2026-03-11')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('resolves preset and custom ranges with a sensible grouping', () => {
    expect(resolveRange('today', now)).toEqual({
      from: '2026-03-11',
      to: '2026-03-11',
      group: 'day',
    })
    expect(resolveRange('7d', now).from).toBe('2026-03-05')
    expect(resolveRange('30d', now).from).toBe('2026-02-10')
    expect(resolveRange('12m', now)).toMatchObject({ from: '2025-03-12', group: 'month' })
    expect(resolveRange('custom', now, { from: '2026-01-01', to: '2026-01-20' }).group).toBe('day')
    expect(resolveRange('custom', now, { from: '2026-01-01', to: '2026-03-01' }).group).toBe('week')
    expect(resolveRange('custom', now, { from: '2025-01-01', to: '2026-01-01' }).group).toBe(
      'month',
    )
    expect(
      resolveRange('custom', now, { from: '2025-01-01', to: '2026-01-01', group: 'year' }).group,
    ).toBe('year')
    for (const bad of [
      {},
      { from: '2026-02-01', to: '2026-01-01' },
      { from: '2020-01-01', to: '2026-01-01' },
      { from: 'x', to: '2026-01-01' },
    ])
      expect(() => resolveRange('custom', now, bad)).toThrow('insights.range')
  })

  it('buckets by day, Monday-week, month and year', () => {
    expect(bucketOf('2026-03-11', 'day')).toBe('2026-03-11')
    expect(bucketOf('2026-03-11', 'week')).toBe('2026-03-09')
    expect(bucketOf('2026-03-15', 'week')).toBe('2026-03-09')
    expect(bucketOf('2026-03-11', 'month')).toBe('2026-03')
    expect(bucketOf('2026-03-11', 'year')).toBe('2026')
  })

  it('sums totals and derives profit, AOV and conversion', () => {
    const s = summarize([
      day('2026-03-10', {
        visitors: 40,
        ordersPlaced: 2,
        ordersDelivered: 1,
        revenue: 50000,
        cost: 30000,
      }),
      day('2026-03-11', {
        visitors: 10,
        ordersPlaced: 3,
        ordersDelivered: 1,
        revenue: 25000,
        cost: 5000,
      }),
    ])
    expect(s).toMatchObject({
      visitors: 50,
      revenue: 75000,
      grossProfit: 40000,
      aov: 37500,
      conversion: 0.1,
    })
    expect(summarize([])).toMatchObject({ aov: 0, conversion: 0 })
  })

  it('fills every bucket in the range', () => {
    const r = { from: '2026-03-09', to: '2026-03-11', group: 'day' as const }
    expect(
      series([day('2026-03-10', { pageViews: 5 })], r).map((p) => [p.bucket, p.pageViews]),
    ).toEqual([
      ['2026-03-09', 0],
      ['2026-03-10', 5],
      ['2026-03-11', 0],
    ])
  })
})
