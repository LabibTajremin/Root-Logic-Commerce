import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it, vi } from 'vitest'
import { createMediaRepo } from '@/infrastructure/db/repositories/media-repo'
import { createContainer } from '@/server/container'
import { createTestDb } from '../fixtures/db'
import { seedStore, testConfig } from '../fixtures/store'

describe('container', () => {
  it('wires every module to the database and reports subscriber failures', async () => {
    const db = await createTestDb()
    const onEventError = vi.fn()
    const c = createContainer({
      config: testConfig({ entitlements: ['seoPro'] }),
      db,
      onEventError,
    })
    const store = await seedStore(db)
    const cat = await c.catalog.createCategory(store, { name: '★' })
    expect(cat.slug).toMatch(/^p-[0-9a-f]{6}$/)
    expect(await c.plans.has(store, 'seoPro')).toBe(true)
    expect(await c.stores.findBySlug('shop')).toMatchObject({ id: store })
    c.bus.on('order.placed', () => {
      throw new Error('mail down')
    })
    await c.bus.emit('order.placed', { storeId: store, orderId: 'x', orderNo: 1 })
    expect(onEventError).toHaveBeenCalledWith(expect.any(Error), 'order.placed')
    expect(Object.keys(c).sort()).toEqual([
      'access',
      'bus',
      'catalog',
      'insights',
      'limits',
      'media',
      'messaging',
      'orders',
      'otp',
      'plans',
      'promotions',
      'secrets',
      'settings',
      'stock',
      'stores',
    ])
  })

  it('uploads fail with a friendly error when the storage driver has no adapter yet', async () => {
    const db = await createTestDb()
    const base = testConfig()
    const c = createContainer({
      config: { ...base, storage: { ...base.storage, driver: 's3' } },
      db,
      onEventError: () => {},
    })
    const store = await seedStore(db)
    const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#fff' } })
      .png()
      .toBuffer()
    await expect(c.media.upload(store, 'product', new Uint8Array(png))).rejects.toThrow(
      'media.storage_unavailable',
    )
    const row = await createMediaRepo(db).insert(store, {
      kind: 'upload',
      ref: `${store}/old`,
      width: 320,
      bytes: 1,
      dominantColor: '#000000',
    })
    expect(await c.media.read(store, row.id, 320)).toBeNull()
  })

  it('queues order messages on the enabled channels and delivers them from the outbox', async () => {
    const db = await createTestDb()
    const file = join(mkdtempSync(join(tmpdir(), 'rlc-')), 'n.log')
    const c = createContainer({
      config: testConfig({ notifyLogFile: file }),
      db,
      onEventError: () => {},
    })
    const store = await seedStore(db)
    const { business, version } = await c.settings.get(store, { storeName: 'Shop' })
    await c.settings.saveBusiness(
      store,
      {
        ...business,
        messages: {
          ...business.messages,
          ownerEmail: 'owner@x.test',
          sms: { ...business.messages.sms, enabled: true },
          email: { ...business.messages.email, enabled: true },
        },
      },
      version,
    )
    const p = await c.catalog.createProduct(store, {
      name: 'Tea',
      price: 50000,
      stock: 5,
      status: 'active',
    })
    const zones = (await c.settings.get(store, { storeName: 'Shop' })).business.deliveryZones
    const o = await c.orders.placeOrder(
      store,
      {
        name: 'Rahim',
        phone: '01712345678',
        email: 'r@x.test',
        address: 'House 1',
        area: 'Mirpur',
        district: 'Dhaka',
        zoneId: zones[0]!.id,
        items: [{ productId: p.id, quantity: 1 }],
      },
      zones,
    )
    // Events for an order that no longer exists are ignored by every subscriber.
    for (const ev of ['order.confirmed', 'order.delivered'] as const)
      await c.bus.emit(ev, {
        storeId: store,
        orderId: '00000000-0000-4000-8000-000000000000',
        orderNo: 1,
      })
    expect(await c.messaging.processDue()).toEqual({ sent: 3, failed: 0 })
    const log = readFileSync(file, 'utf8')
    expect(log).toContain(`we got your order #${o.orderNo} (৳560)`)
    expect(log).toContain('"to":"r@x.test"')
    expect(log).toContain('"to":"owner@x.test"')
  })

  it('counts views and delivered revenue, and sends live messages through the store’s channels', async () => {
    const db = await createTestDb()
    const c = createContainer({
      config: { ...testConfig(), messagesTransport: 'live' },
      db,
      onEventError: () => {},
    })
    const store = await seedStore(db)
    await c.insights.track(store, { ip: '1.1.1.1', ua: 'Mozilla/5.0', path: '/' })
    const p = await c.catalog.createProduct(store, {
      name: 'Tea',
      price: 50000,
      costPrice: 20000,
      stock: 5,
      status: 'active',
    })
    const zones = [{ id: 'z', label: 'Z', charge: 0 }]
    const o = await c.orders.placeOrder(
      store,
      {
        name: 'Rahim',
        phone: '01712345678',
        address: 'House 1',
        area: 'Mirpur',
        district: 'Dhaka',
        zoneId: 'z',
        items: [{ productId: p.id, quantity: 2 }],
      },
      zones,
    )
    for (const s of ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const)
      await c.orders.changeStatus(store, o.id, s, null)
    const r = await c.insights.report(store, 'today')
    expect(r.summary).toMatchObject({
      visitors: 1,
      pageViews: 1,
      ordersPlaced: 1,
      ordersDelivered: 1,
      revenue: 100000,
      cost: 40000,
    })
    // Live SMS without a configured gateway fails, so the OTP request reports it.
    const { business, version } = await c.settings.get(store, { storeName: 'Shop' })
    await c.settings.saveBusiness(
      store,
      {
        ...business,
        messages: { ...business.messages, sms: { ...business.messages.sms, enabled: true } },
      },
      version,
    )
    await expect(c.otp.request(store, 'sms', '01712345678', 'Shop')).rejects.toThrow()
  })
})
