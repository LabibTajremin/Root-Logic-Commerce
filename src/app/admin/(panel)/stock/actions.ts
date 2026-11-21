'use server'

import { act, type ActionState } from '../act'

export async function adjustStock(_: ActionState, form: FormData) {
  return act('stock.manage', async ({ stock, store, actor }) => {
    await stock.adjustStock(
      store.id,
      String(form.get('productId')),
      { delta: Number(form.get('delta')), note: form.get('note') as string },
      actor!.id,
    )
  })
}
