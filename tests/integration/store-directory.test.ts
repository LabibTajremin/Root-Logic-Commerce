import { describe, expect, it } from 'vitest'
import { createTestDb } from '../fixtures/db'
import { storeDomains, stores } from '@/infrastructure/db/schema'
import { createStoreDirectory } from '@/infrastructure/db/repositories/store-directory'
import { createDb } from '@/infrastructure/db/client'

describe('store directory (PGlite)', () => {
  it('finds stores by slug and by host, and reads back what was written', async () => {
    const db = await createTestDb()
    const [shop] = await db.insert(stores).values({ slug: 'shop', name: 'Shop' }).returning()
    await db
      .insert(storeDomains)
      .values({ storeId: shop!.id, host: 'shop.example.com', primary: true })
    const dir = createStoreDirectory(db)

    expect(await dir.findBySlug('shop')).toEqual({ id: shop!.id, slug: 'shop', active: true })
    expect(await dir.findByHost('shop.example.com')).toEqual({
      id: shop!.id,
      slug: 'shop',
      active: true,
    })
    expect(await dir.findBySlug('nope')).toBeNull()
    expect(await dir.findByHost('nope.example.com')).toBeNull()
  })

  it('rejects a duplicate host', async () => {
    const db = await createTestDb()
    const [a] = await db.insert(stores).values({ slug: 'a', name: 'A' }).returning()
    await db.insert(storeDomains).values({ storeId: a!.id, host: 'a.test' })
    await expect(
      db.insert(storeDomains).values({ storeId: a!.id, host: 'a.test' }),
    ).rejects.toThrow()
  })
})

describe('createDb', () => {
  it('builds a lazy postgres client without connecting', () => {
    const db = createDb('postgres://u:p@127.0.0.1:1/none')
    expect(typeof db.select).toBe('function')
  })
})
