'use server'

import { act, type ActionState } from '../act'

// Every key is an input of the coupon form, so `get` never returns null.
const text = (f: FormData, k: string) => String(f.get(k)).trim()
const minor = (v: string) => Math.round(Number(v || 0) * 100)
const limit = (v: string) => (v ? Number(v) : null)
const day = (v: string, end: boolean) =>
  v ? new Date(`${v}T${end ? '23:59:59' : '00:00:00'}+06:00`) : null

const read = (f: FormData) => {
  const kind = text(f, 'kind') as 'percent'
  return {
    code: text(f, 'code'),
    kind,
    // Percent is a plain number; a fixed amount is typed in taka.
    value: kind === 'percent' ? Number(text(f, 'value')) : minor(text(f, 'value')),
    minSubtotal: minor(text(f, 'minSubtotal')),
    productIds: f.getAll('productIds').map(String),
    categoryIds: f.getAll('categoryIds').map(String),
    startsAt: day(text(f, 'startsAt'), false),
    endsAt: day(text(f, 'endsAt'), true),
    totalLimit: limit(text(f, 'totalLimit')),
    perPhoneLimit: limit(text(f, 'perPhoneLimit')),
    autoApply: f.get('autoApply') === 'on',
    active: f.get('active') === 'on',
  }
}

export async function saveCoupon(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ coupons, store }) => {
    const id = text(form, 'id')
    if (id) await coupons.update(store.id, id, read(form))
    else await coupons.create(store.id, read(form))
    return '/admin/coupons'
  })
}
