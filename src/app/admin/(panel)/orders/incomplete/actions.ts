'use server'

import { currentSettings } from '@/server/request'
import { activeModules, shopRulesOf } from '@/app/(storefront)/shop-rules'
import { act, type ActionState } from '../../act'

// id is an input of the draft forms, so `get` never returns null.
export async function convertDraft(_: ActionState, form: FormData) {
  return act('orders.manage', async ({ drafts, orders, store, features }) => {
    const { business } = await currentSettings()
    const on = activeModules(await features.list(store.id))
    const order = await drafts.convert(store.id, String(form.get('id')), (input) =>
      orders.placeOrder(store.id, input, shopRulesOf(business, on)),
    )
    return `/admin/orders/${order.id}`
  })
}

export async function discardDraft(_: ActionState, form: FormData) {
  return act('orders.manage', ({ drafts, store }) =>
    drafts.discard(store.id, String(form.get('id'))),
  )
}
