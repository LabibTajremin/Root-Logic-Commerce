import { describe, expect, it } from 'vitest'
import { createNotifications } from '@/modules/notifications'
import { createNotificationsRepo } from '@/infrastructure/db/repositories/notifications-repo'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

describe('notifications repo', () => {
  it('stores order notices per store, newest first, and marks them read', async () => {
    const db = await createTestDb()
    const [a, b] = [await seedStore(db), await seedStore(db, 'other')]
    const n = createNotifications({ repo: createNotificationsRepo(db) })
    await n.onOrderPlaced({ storeId: a, orderId: 'o1', orderNo: 1 })
    await n.onOrderPlaced({ storeId: a, orderId: 'o2', orderNo: 2 })
    await n.onOrderPlaced({ storeId: b, orderId: 'o3', orderNo: 1 })
    const list = await n.list(a)
    expect(list.map((x) => x.data.orderNo).sort()).toEqual([1, 2])
    expect((await n.poll(a)).unread).toBe(2)
    await n.markRead(a, list[0]!.id)
    expect((await n.poll(a)).unread).toBe(1)
    await n.markAllRead(a)
    expect((await n.poll(a)).unread).toBe(0)
    expect((await n.poll(b)).unread).toBe(1)
  })
})
