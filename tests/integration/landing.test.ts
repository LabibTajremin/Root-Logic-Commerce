import { describe, expect, it } from 'vitest'
import { shopRules } from '@/modules/orders'
import { createContainer } from '@/server/container'
import { createTestDb } from '../fixtures/db'
import { seedStore, testConfig } from '../fixtures/store'

describe('landing pages (H5)', () => {
  it('stores pages per store, counts visits and the orders placed on each', async () => {
    const db = await createTestDb()
    const c = createContainer({ config: testConfig(), db, onEventError: () => {} })
    const [a, b] = [await seedStore(db), await seedStore(db, 'other')]
    const p = await c.catalog.createProduct(a, {
      name: 'Rose Attar',
      price: 100000,
      stock: 9,
      status: 'active',
    })
    const input = { title: 'Eid', slug: 'eid', productId: p.id, design: 'festive' as const }

    const id = await c.landing.create(a, input, 'en')
    await expect(c.landing.create(a, input, 'en')).rejects.toThrow('landing.slug_taken')
    // The product belongs to store a; store b cannot build on it.
    await expect(c.landing.create(b, input, 'en')).rejects.toThrow('product.not_found')
    const other = await c.landing.create(a, { ...input, slug: 'two' }, 'bn')

    const page = await c.landing.get(a, id)
    expect(page).toMatchObject({ slug: 'eid', design: 'festive', visits: 0, orders: 0 })
    expect(page.blocks.find((x) => x.kind === 'packs')!.packs[1]).toEqual({ qty: 2, price: 190000 })
    await expect(c.landing.save(a, id, { ...page, slug: 'two' })).rejects.toThrow(
      'landing.slug_taken',
    )
    const endsAt = new Date('2030-01-01T10:00:00Z')
    await c.landing.save(a, id, {
      ...page,
      title: 'Eid sale',
      blocks: page.blocks.map((x) => (x.kind === 'price' ? { ...x, endsAt } : x)),
    })
    // Stored as JSON, read back as a date.
    expect((await c.landing.get(a, id)).blocks.find((x) => x.kind === 'price')!.endsAt).toEqual(
      endsAt,
    )
    await expect(c.landing.get(b, id)).rejects.toThrow('landing.not_found')
    await expect(
      c.landing.save(a, '00000000-0000-4000-8000-000000000000', { ...page, slug: 'free' }),
    ).rejects.toThrow('landing.not_found')

    await c.landing.visit(a, id)
    await c.landing.visit(a, id)
    const zones = (await c.settings.get(a, { storeName: 'Shop' })).business.deliveryZones
    await c.orders.placeOrder(
      a,
      {
        name: 'Rahim',
        phone: '01712345678',
        address: 'House 1',
        area: 'Mirpur',
        district: 'Dhaka',
        zoneId: zones[0]!.id,
        items: [{ productId: p.id, quantity: 2 }],
      },
      { ...shopRules, zones },
      { source: 'landing', landingId: id, discount: c.landing.discount(page, 2, 100000) },
    )
    const listed = await c.landing.list(a)
    expect(listed.map((x) => x.slug)).toEqual(['two', 'eid'])
    expect(listed.find((x) => x.id === id)).toMatchObject({
      title: 'Eid sale',
      visits: 2,
      orders: 1,
    })
    expect((await c.orders.listOrders(a, {})).rows[0]).toMatchObject({ source: 'landing' })

    expect(await c.landing.forShoppers(a, 'eid')).toMatchObject({ id })
    await c.landing.setHidden(a, id, true)
    expect(await c.landing.forShoppers(a, 'eid')).toBeNull()
    await c.landing.remove(a, other)
    expect(await c.landing.list(a)).toHaveLength(1)
  })
})
