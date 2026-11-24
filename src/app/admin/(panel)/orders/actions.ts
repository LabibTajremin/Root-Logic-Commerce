'use server'

import { orderStatuses, type OrderStatus } from '@/modules/orders'
import { act, type ActionState } from '../act'

export async function changeStatus(_: ActionState, form: FormData) {
  const id = String(form.get('id'))
  const to = String(form.get('to')) as OrderStatus
  return act('orders.manage', async ({ orders, store, actor }) => {
    if (!orderStatuses.includes(to)) return
    // C13 extras: a date (Dhaka time) for SCHEDULED, delivered counts for a partial delivery.
    const date = String(form.get('scheduledFor') ?? '')
    const delivered = Object.fromEntries(
      [...form.entries()].flatMap(([k, v]) =>
        k.startsWith('delivered.') ? [[k.slice(10), Number(v)]] : [],
      ),
    )
    await orders.changeStatus(store.id, id, to, actor!.id, null, {
      scheduledFor: date ? new Date(`${date}T09:00:00+06:00`) : undefined,
      delivered,
    })
  })
}

// id is an input of the trash forms.
export async function trashOrder(_: ActionState, form: FormData) {
  return act('orders.manage', ({ orders, store }) => orders.trash(store.id, String(form.get('id'))))
}

export async function restoreOrder(_: ActionState, form: FormData) {
  return act('orders.manage', ({ orders, store }) =>
    orders.restore(store.id, String(form.get('id'))),
  )
}

// Every key read is an input of the return form; a line left at 0 isn't coming back.
export async function recordReturn(_: ActionState, form: FormData) {
  return act('orders.manage', async ({ orders, store, actor }) => {
    const f = (k: string) => String(form.get(k))
    const swap = f('exchangeOrderNo').replace(/\D/g, '')
    await orders.recordReturn(
      store.id,
      f('id'),
      {
        kind: f('kind') as 'return',
        reason: f('reason') as 'other',
        note: f('note'),
        items: [...form.entries()].flatMap(([k, v]) =>
          k.startsWith('ret.') && Number(v) > 0
            ? [{ itemId: k.slice(4), quantity: Number(v) }]
            : [],
        ),
        refund: Math.round(Number(f('refund')) * 100),
        refundMethod: f('refundMethod'),
        restock: form.get('restock') === 'on',
        exchangeOrderNo: swap ? Number(swap) : null,
      },
      actor!.id,
    )
  })
}
