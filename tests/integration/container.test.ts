import { describe, expect, it, vi } from 'vitest'
import { createContainer } from '@/server/container'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

describe('container', () => {
  it('wires every module to the database and reports subscriber failures', async () => {
    const db = await createTestDb()
    const onEventError = vi.fn()
    const c = createContainer({ config: { entitlements: ['seoPro'] }, db, onEventError })
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
      'orders',
      'otp',
      'plans',
      'settings',
      'stock',
      'stores',
    ])
  })
})
