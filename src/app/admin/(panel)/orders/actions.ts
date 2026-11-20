'use server'

import { orderStatuses, type OrderStatus } from '@/modules/orders'
import { act, type ActionState } from '../act'

export async function changeStatus(_: ActionState, form: FormData) {
  const id = String(form.get('id'))
  const to = String(form.get('to')) as OrderStatus
  return act('orders.manage', async ({ orders, store, actor }) => {
    if (!orderStatuses.includes(to)) return
    await orders.changeStatus(store.id, id, to, actor!.id, null)
  })
}
