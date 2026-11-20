'use server'

import { act, type ActionState } from '../act'

export async function toggleEntitlement(_: ActionState, form: FormData) {
  const id = String(form.get('id'))
  return act('plans.manage', async ({ plans, store }) => {
    if (form.get('op') === 'grant') await plans.grant(store.id, id)
    else await plans.revoke(store.id, id)
  })
}
