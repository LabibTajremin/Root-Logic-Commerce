import { sql } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { createInsightsRepo } from '@/infrastructure/db/repositories/insights-repo'
import { pageViews } from '@/infrastructure/db/schema'
import { createContainer } from '@/server/container'
import { createTestDb } from '../fixtures/db'
import { seedStore, testConfig } from '../fixtures/store'

describe('insights repo', () => {
  it('counts views and first-time visitors per day and bumps order counters', async () => {
    const db = await createTestDb()
    const [a, b] = [await seedStore(db, 'a'), await seedStore(db, 'b')]
    const repo = createInsightsRepo(db)
    await repo.recordView(a, '2026-03-11', 'v1', '/')
    await repo.recordView(a, '2026-03-11', 'v1', '/p/tea')
    await repo.recordView(a, '2026-03-11', 'v2', '/')
    await repo.recordView(b, '2026-03-11', 'v1', '/')
    await repo.bump(a, '2026-03-11', { ordersDelivered: 1, revenue: 500, cost: 200 })
    await repo.bump(a, '2026-03-12', { ordersPlaced: 1 })
    expect(await repo.days(a, '2026-03-10', '2026-03-12')).toMatchObject([
      {
        date: '2026-03-11',
        visitors: 2,
        pageViews: 3,
        ordersDelivered: 1,
        revenue: 500,
        cost: 200,
      },
      { date: '2026-03-12', visitors: 0, ordersPlaced: 1 },
    ])
    expect(await repo.days(a, '2026-03-12', '2026-03-12')).toHaveLength(1)
    await db.update(pageViews).set({ createdAt: sql`now() - interval '40 days'` })
    await repo.purgeViews(new Date(Date.now() - 30 * 86_400_000))
    expect(await db.select().from(pageViews)).toEqual([])
  })

  it('ranks top products from live orders in the range (cancelled excluded)', async () => {
    const db = await createTestDb()
    const c = createContainer({ config: testConfig(), db, onEventError: () => {} })
    const s = await seedStore(db)
    const zones = [{ id: 'z', label: 'Z', charge: 0 }]
    const make = async (name: string, stock = 9) =>
      c.catalog.createProduct(s, { name, price: 1000, stock, status: 'active' })
    const [tea, rice] = [await make('Tea'), await make('Rice')]
    const order = (productId: string, quantity: number) =>
      c.orders.placeOrder(
        s,
        {
          name: 'R a',
          phone: '01712345678',
          address: 'House 1',
          area: 'Mirpur',
          district: 'Dhaka',
          zoneId: 'z',
          items: [{ productId, quantity }],
        },
        zones,
      )
    await order(tea.id, 2)
    await order(rice.id, 1)
    const gone = await order(rice.id, 5)
    await c.orders.changeStatus(s, gone.id, 'CANCELLED', null)
    const repo = createInsightsRepo(db)
    const from = new Date(Date.now() - 86_400_000)
    const to = new Date(Date.now() + 86_400_000)
    expect(await repo.topProducts(s, from, to, 5)).toEqual([
      { name: 'Tea', quantity: 2, revenue: 2000 },
      { name: 'Rice', quantity: 1, revenue: 1000 },
    ])
    expect(await repo.topProducts(s, to, to, 5)).toEqual([])
  })
})
