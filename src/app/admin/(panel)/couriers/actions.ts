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

// `id`, `collected` and `charge` (taka) are inputs of a parcel's amounts form.
export async function setParcelAmounts(_: ActionState, form: FormData) {
  const paisa = (k: string) => Math.round(Number(form.get(k)) * 100)
  return act('orders.manage', ({ courier, store }) =>
    courier.setAmounts(store.id, String(form.get('id')), {
      collected: paisa('collected'),
      charge: paisa('charge'),
    }),
  )
}

/** E5: the ticked parcels (ids join the form from each row) were paid out by the courier. */
export async function markParcelsPaid(_: ActionState, form: FormData) {
  return act('orders.manage', async ({ courier, store }) => {
    await courier.markPaid(store.id, form.getAll('ids').map(String))
  })
}

// `kind`, `provider`, `riderName` and `riderPhone` are inputs of the new-session form.
export async function startScanSession(_: ActionState, form: FormData) {
  return act('orders.manage', async ({ courier, store }) => {
    const id = await courier.startSession(store.id, {
      kind: String(form.get('kind')) as 'handover',
      provider: String(form.get('provider')) as CourierProvider,
      riderName: String(form.get('riderName')),
      riderPhone: String(form.get('riderPhone')),
    })
    return `/admin/couriers/scan/${id}`
  })
}

// `session` and `code` are inputs of the scan form (a scanner gun types the code and Enter).
export async function scanParcel(_: ActionState, form: FormData) {
  return act('orders.manage', async ({ courier, store, actor }) => {
    await courier.scan(store.id, String(form.get('session')), String(form.get('code')), actor!.id)
  })
}
