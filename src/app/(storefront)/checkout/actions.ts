'use server'

import { isDomainError } from '@/modules/shared'
import { storefront } from '../storefront'

export type PlaceResult = { error: string } | { orderNo: number }

const optional = (v: string) => v.trim() || null

export const placeOrder = async (form: FormData): Promise<PlaceResult> => {
  const { orders, store, business, t } = await storefront()
  const f = (k: string) => String(form.get(k))
  try {
    const order = await orders.placeOrder(
      store.id,
      {
        name: f('name'),
        phone: f('phone'),
        email: optional(f('email')),
        district: f('district'),
        area: f('area'),
        address: f('address'),
        note: optional(f('note')),
        zoneId: f('zoneId'),
        items: JSON.parse(f('items')),
      },
      business.deliveryZones,
    )
    return { orderNo: order.orderNo }
  } catch (e) {
    // Never a 500 at checkout: unknown failures are logged and shown as a retry hint.
    if (!isDomainError(e)) console.error('[checkout]', e)
    return { error: t(isDomainError(e) ? `error.${e.code}` : 'error.unexpected') }
  }
}
