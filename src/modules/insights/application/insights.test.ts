import { describe, expect, it } from 'vitest'
import type { DayStats } from '../domain/insights'
import { createInsights } from './insights'
import type { Counters, InsightsRepo } from './ports'

const setup = () => {
  const views: string[] = []
  const bumps: [string, Counters][] = []
  const purged: Date[] = []
  const repo: InsightsRepo = {
    recordView: async (_s, date, visitor, path) => void views.push(`${date}|${visitor}|${path}`),
    bump: async (_s, date, d) => void bumps.push([date, d]),
    days: async (_s, from) => [
      {
        date: from,
        visitors: 4,
        pageViews: 9,
        ordersPlaced: 1,
        ordersConfirmed: 0,
        ordersDelivered: 1,
        ordersCancelled: 0,
        ordersReturned: 0,
        revenue: 1000,
        cost: 400,
      } as DayStats,
    ],
    topProducts: async () => [{ name: 'Tea', quantity: 3, revenue: 1500 }],
    purgeViews: async (before) => void purged.push(before),
  }
  const insights = createInsights({
    repo,
    hash: (s) => `h(${s})`,
    money: async (_s, id) => (id === 'gone' ? null : { revenue: 1000, cost: 400 }),
    now: () => new Date('2026-03-10T20:00:00Z'),
  })
  return { insights, views, bumps, purged }
}

describe('insights', () => {
  it('counts storefront views under a daily visitor hash; skips bots, admin and API', async () => {
    const { insights, views } = setup()
    const ua = 'Mozilla/5.0 (Linux; Android 14)'
    await insights.track('s', { ip: '1.2.3.4', ua, path: '/p/tea' })
    await insights.track('s', { ip: '1.2.3.4', ua: 'Googlebot/2.1', path: '/' })
    await insights.track('s', { ip: '1.2.3.4', ua, path: '/admin/orders' })
    await insights.track('s', { ip: '1.2.3.4', ua, path: '/api/x' })
    expect(views).toEqual([`2026-03-11|h(s:1.2.3.4:${ua}:2026-03-11)|/p/tea`])
  })

  it('turns order events into daily counters; delivery adds revenue, a return takes it back', async () => {
    const { insights, bumps } = setup()
    for (const s of [
      'placed',
      'confirmed',
      'processing',
      'cancelled',
      'delivered',
      'returned',
    ] as const)
      await insights.onOrderEvent(s, { storeId: 's', orderId: 'o' })
    await insights.onOrderEvent('delivered', { storeId: 's', orderId: 'gone' })
    expect(bumps).toEqual([
      ['2026-03-11', { ordersPlaced: 1 }],
      ['2026-03-11', { ordersConfirmed: 1 }],
      ['2026-03-11', { ordersCancelled: 1 }],
      ['2026-03-11', { ordersDelivered: 1, revenue: 1000, cost: 400 }],
      ['2026-03-11', { ordersReturned: 1, revenue: -1000, cost: -400 }],
    ])
  })

  it('reports totals, a filled series and top products for a range', async () => {
    const { insights } = setup()
    const r = await insights.report('s', '7d')
    expect(r.range).toEqual({ from: '2026-03-05', to: '2026-03-11', group: 'day' })
    expect(r.summary).toMatchObject({ visitors: 4, grossProfit: 600, aov: 1000, conversion: 0.25 })
    expect(r.series).toHaveLength(7)
    expect(r.top).toEqual([{ name: 'Tea', quantity: 3, revenue: 1500 }])
    expect(
      (await insights.report('s', 'custom', { from: '2026-01-01', to: '2026-01-02' })).series,
    ).toHaveLength(2)
    const bad = await insights.report('s', 'custom', { from: '2026-02-01', to: '2026-01-01' })
    expect(bad).toMatchObject({ fellBack: true, range: { from: '2026-02-10', to: '2026-03-11' } })
    expect(r.fellBack).toBe(false)
  })

  it('purges raw views older than 30 days', async () => {
    const { insights, purged } = setup()
    await insights.purge()
    expect(purged[0]!.toISOString()).toBe('2026-02-08T20:00:00.000Z')
  })
})
