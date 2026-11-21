'use server'

import { otpTarget } from '@/modules/messages'
import { isDomainError } from '@/modules/shared'
import { currentIp } from '@/server/request'
import { storefront } from '../storefront'

export type PlaceResult = { error: string } | { otp: string } | { orderNo: number }

const optional = (v: string) => v.trim() || null

export const placeOrder = async (form: FormData): Promise<PlaceResult> => {
  const [{ orders, otp, store, business, limits, t }, ip] = await Promise.all([
    storefront(),
    currentIp(),
  ])
  const f = (k: string) => String(form.get(k) ?? '')
  try {
    limits.checkout.assert(`${store.id}:${ip}`)
    const email = optional(f('email'))
    // With a verification channel on, the first submit only sends the code.
    const check = otpTarget(business.otp, { phone: f('phone'), email })
    if (check) {
      const code = optional(f('code'))
      if (!code)
        return { otp: await otp.request(store.id, check.channel, check.target, store.name) }
      await otp.verify(store.id, check.target, code)
    }
    const order = await orders.placeOrder(
      store.id,
      {
        name: f('name'),
        phone: f('phone'),
        email,
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
