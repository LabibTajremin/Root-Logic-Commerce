import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { storeDomains, users } from '@/infrastructure/db/schema'
import { ensureStore, ensureUser } from '@/server/bootstrap'
import { createTestDb } from '../fixtures/db'

describe('bootstrap', () => {
  it('creates store, domains and owner once; re-running changes nothing', async () => {
    const db = await createTestDb()
    const seed = { slug: 's', name: 'S', hosts: ['a.test', 'b.test'] }
    const owner = { email: 'Owner@X.test', password: 'pass-1234', name: 'O' }
    const id = await ensureStore(db, { ...seed, owner })
    expect(await ensureStore(db, { ...seed, owner })).toBe(id)
    expect(await ensureStore(db, seed)).toBe(id)
    expect(await db.select().from(storeDomains)).toHaveLength(2)
    const [u] = await db.select().from(users).where(eq(users.email, 'owner@x.test'))
    expect(u).toMatchObject({ role: 'OWNER', storeId: id })
    await ensureUser(db, {
      email: 'lab@x.test',
      password: 'p',
      name: 'L',
      role: 'SUPER_ADMIN',
      storeId: null,
    })
    expect(await db.select().from(users)).toHaveLength(2)
  })
})
