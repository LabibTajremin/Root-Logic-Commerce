'use server'

import type { CourierProvider } from '@/modules/courier'
import { act, type ActionState } from '../act'

// `provider`, `label` and the provider's key fields are inputs of that provider's form;
// the provider's schema keeps only its own keys.
export async function addCourierAccount(_: ActionState, form: FormData) {
  const { provider, label, ...credentials } = Object.fromEntries(
    [...form.entries()].filter(([k]) => !k.startsWith('$')).map(([k, v]) => [k, String(v)]),
  )
  return act('settings.manage', async ({ courier, store }) => {
    await courier.addAccount(store.id, {
      provider: String(provider) as CourierProvider,
      label: String(label),
      credentials,
    })
  })
}

export async function removeCourierAccount(_: ActionState, form: FormData) {
  return act('settings.manage', ({ courier, store }) =>
    courier.removeAccount(store.id, String(form.get('id'))),
  )
}

export async function makeDefaultCourier(_: ActionState, form: FormData) {
  return act('settings.manage', ({ courier, store }) =>
    courier.setDefault(store.id, String(form.get('id'))),
  )
}

// `id` (order) and `account` are inputs of the send form on the order page.
export async function sendToCourier(_: ActionState, form: FormData) {
  return act('orders.manage', async ({ courier, store, actor }) => {
    await courier.send(store.id, String(form.get('id')), String(form.get('account')), actor!.id)
  })
}
