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
      'media',
      'orders',
      'otp',
      'plans',
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
})
