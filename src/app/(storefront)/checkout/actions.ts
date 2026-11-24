'use server'

import { otpTarget } from '@/modules/messages'
import { actionError } from '../action-error'
import { shopRulesOf } from '../shop-rules'
import { currentIp } from '@/server/request'
import { storefront } from '../storefront'

export type PlaceResult = { error: string } | { otp: string } | { orderNo: number }
export type Quote = { error: string } | { discount: number; couponCode: string | null }

const optional = (v: string) => v.trim() || null
// Fields a shop switched off are simply missing from the form.
const field = (form: FormData, k: string) => String(form.get(k) ?? '')

export const placeOrder = async (form: FormData): Promise<PlaceResult> => {
  const [{ orders, drafts, otp, store, business, limits, t }, ip] = await Promise.all([
    storefront(),
    currentIp(),
  ])
  const f = (k: string) => field(form, k)
  try {
    limits.checkout.assert(`${store.id}:${ip}`)
    const email = optional(f('email'))
    if (business.checkout.email === 'required' && !email)
      return { error: t('error.checkout.email') }
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
        altPhone: f('altPhone'),
        preferredTime: (f('preferredTime') || 'any') as 'any',
        giftWrap: form.get('giftWrap') === 'on',
        // Always sent: 'null' until the shopper shares a location.
        location: JSON.parse(f('location')),
        email,
        district: f('district'),
        area: f('area'),
        address: f('address'),
        note: optional(f('note')),
        zoneId: f('zoneId'),
        couponCode: f('couponCode'),
        items: JSON.parse(f('items')),
      },
      shopRulesOf(business),
    )
    await drafts.ordered(store.id, f('phone'))
    return { orderNo: order.orderNo }
  } catch (e) {
    return actionError(t, e, 'checkout')
  }
}

/** C2: the discount a code (or, with none typed, the best automatic coupon) gives this cart. */
export const quoteOrder = async (form: FormData): Promise<Quote> => {
  const { orders, store, business, t } = await storefront()
  // Every key read is an input of the checkout form.
  const f = (k: string) => String(form.get(k))
  try {
    const q = await orders.quote(
      store.id,
      {
        // Only the cart, zone and code matter for the price; the rest is a placeholder.
        name: 'Quote',
        phone: f('phone') || '01700000000',
        district: 'Dhaka',
        area: 'Dhaka',
        address: 'Quote only',
        zoneId: f('zoneId'),
        couponCode: f('couponCode'),
        items: JSON.parse(f('items')),
      },
      shopRulesOf(business),
    )
    return { discount: q.discount, couponCode: q.couponCode }
  } catch (e) {
    return actionError(t, e, 'quote')
  }
}

/** C1: what the shopper has typed so far (only once the phone is valid; skipped quietly otherwise). */
export const saveDraft = async (form: FormData): Promise<void> => {
  const [{ drafts, store }, ip] = await Promise.all([storefront(), currentIp()])
  const f = (k: string) => field(form, k)
  await drafts.save(store.id, ip, {
    phone: f('phone'),
    name: f('name'),
    email: f('email'),
    district: f('district'),
    area: f('area'),
    address: f('address'),
    note: f('note'),
    zoneId: f('zoneId'),
    items: JSON.parse(f('items')),
  })
}
