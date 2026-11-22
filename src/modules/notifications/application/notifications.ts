export type NoticeKind = 'order'
export type Notice = {
  id: string
  kind: NoticeKind
  ref: string
  data: { orderNo: number }
  readAt: Date | null
  createdAt: Date
}

export type NoticesRepo = {
  insert(storeId: string, n: Pick<Notice, 'kind' | 'ref' | 'data'>): Promise<void>
  list(storeId: string, limit: number): Promise<Notice[]>
  unread(storeId: string): Promise<number>
  markRead(storeId: string, id: string | null): Promise<void>
}

/** F2: the owner hears about new orders in the admin (bell, toast, notification centre). */
export const createNotifications = ({ repo }: { repo: NoticesRepo }) => ({
  onOrderPlaced: (e: { storeId: string; orderId: string; orderNo: number }) =>
    repo.insert(e.storeId, { kind: 'order', ref: e.orderId, data: { orderNo: e.orderNo } }),
  list: (storeId: string) => repo.list(storeId, 50),
  /** What the admin bell polls: unread count and the newest notice. */
  poll: async (storeId: string) => {
    const [unread, [latest]] = await Promise.all([repo.unread(storeId), repo.list(storeId, 1)])
    return { unread, latest: latest ?? null }
  },
  markRead: (storeId: string, id: string) => repo.markRead(storeId, id),
  markAllRead: (storeId: string) => repo.markRead(storeId, null),
})

export type Notifications = ReturnType<typeof createNotifications>
