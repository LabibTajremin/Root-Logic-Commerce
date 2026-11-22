'use server'

import { authorize } from '@/modules/access'
import { act, type ActionState } from '../act'
import { adminContext } from '../context'

/** What the bell polls: unread count and the newest notice. */
export async function pollNotices() {
  const { actor, store, notifications } = await adminContext('orders.manage')
  authorize(actor, 'orders.manage', store.id)
  const { unread, latest } = await notifications.poll(store.id)
  return {
    unread,
    latest: latest && {
      id: latest.id,
      orderNo: latest.data.orderNo,
      href: `/admin/orders/${latest.ref}`,
    },
  }
}

export async function markNoticeRead(_: ActionState, form: FormData) {
  return act('orders.manage', ({ notifications, store }) =>
    notifications.markRead(store.id, String(form.get('id'))),
  )
}

export async function markAllNoticesRead() {
  return act('orders.manage', ({ notifications, store }) => notifications.markAllRead(store.id))
}
