import { describe, expect, it } from 'vitest'
import { createNotifications, type Notice, type NoticesRepo } from './notifications'

describe('notifications (F2)', () => {
  it('a new order becomes an unread notice; the bell polls the count and newest', async () => {
    const rows: (Notice & { storeId: string })[] = []
    const repo: NoticesRepo = {
      insert: async (storeId, n) =>
        void rows.unshift({
          ...n,
          storeId,
          id: `n${rows.length}`,
          readAt: null,
          createdAt: new Date(),
        }),
      list: async (s, limit) => rows.filter((r) => r.storeId === s).slice(0, limit),
      unread: async (s) => rows.filter((r) => r.storeId === s && !r.readAt).length,
      markRead: async (s, id) =>
        rows
          .filter((r) => r.storeId === s && (id === null || r.id === id))
          .forEach((r) => (r.readAt = new Date())),
    }
    const n = createNotifications({ repo })
    expect(await n.poll('s')).toEqual({ unread: 0, latest: null })
    await n.onOrderPlaced({ storeId: 's', orderId: 'o1', orderNo: 1001 })
    await n.onOrderPlaced({ storeId: 's', orderId: 'o2', orderNo: 1002 })
    expect((await n.poll('s')).latest).toMatchObject({ kind: 'order', data: { orderNo: 1002 } })
    await n.markRead('s', 'n1')
    expect((await n.poll('s')).unread).toBe(1)
    await n.markAllRead('s')
    expect((await n.poll('s')).unread).toBe(0)
    expect(await n.list('s')).toHaveLength(2)
  })
})
