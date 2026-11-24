import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { createDrafts, type Drafts } from '@/modules/orders'
import { createDraftsRepo } from '@/infrastructure/db/repositories/drafts-repo'
import { checkoutDrafts } from '@/infrastructure/db/schema'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

let db: Awaited<ReturnType<typeof createTestDb>>, drafts: Drafts, store: string, other: string
const item = { productId: '00000000-0000-4000-8000-000000000001', quantity: 2 }

beforeEach(async () => {
  db = await createTestDb()
  drafts = createDrafts({ repo: createDraftsRepo(db), allow: () => true })
  store = await seedStore(db)
  other = await seedStore(db, 'other')
})

describe('checkout drafts (C1)', () => {
  it('keeps one draft per phone, newest first, per store', async () => {
    await drafts.save(store, 'ip', { phone: '01711111111', name: 'Ra' })
    await drafts.save(store, 'ip', { phone: '01822222222', name: 'Karim' })
    await drafts.save(store, 'ip', { phone: '01711111111', name: 'Rahim', items: [item] })
    await drafts.save(other, 'ip', { phone: '01933333333' })
    const rows = await drafts.list(store)
    expect(rows.map((r) => [r.phone, r.name])).toEqual([
      ['01711111111', 'Rahim'],
      ['01822222222', 'Karim'],
    ])
    expect(rows[0]!.items).toEqual([{ ...item, variantId: null }])
    expect(await drafts.get(store, rows[1]!.id)).toMatchObject({ name: 'Karim' })
    expect(await drafts.get(other, rows[1]!.id)).toBeNull()
  })

  it('removes a draft when discarded or when that phone orders', async () => {
    await drafts.save(store, 'ip', { phone: '01711111111' })
    await drafts.save(store, 'ip', { phone: '01822222222' })
    const [a] = await drafts.list(store)
    await drafts.discard(store, a!.id)
    await drafts.ordered(store, '+8801711111111')
    expect(await drafts.list(store)).toEqual([])
  })

  it('hides and purges drafts older than 30 days', async () => {
    await drafts.save(store, 'ip', { phone: '01711111111' })
    await drafts.save(store, 'ip', { phone: '01822222222' })
    const [old] = await drafts.list(store)
    await db
      .update(checkoutDrafts)
      .set({ updatedAt: new Date(Date.now() - 31 * 86_400_000) })
      .where(eq(checkoutDrafts.id, old!.id))
    expect(await drafts.get(store, old!.id)).toBeNull()
    expect((await drafts.list(store)).length).toBe(1)
    await drafts.purge()
    expect((await db.select().from(checkoutDrafts)).length).toBe(1)
  })
})
