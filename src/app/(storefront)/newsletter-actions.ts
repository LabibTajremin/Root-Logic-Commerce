'use server'

import { currentIp } from '@/server/request'
import { actionError } from './action-error'
import { storefront } from './storefront'

export type SignUp = { ok?: boolean; error?: string }

/** B13: a phone or email with the shopper's consent (rate limited like checkout). */
export const subscribeNewsletter = async (_: SignUp, form: FormData): Promise<SignUp> => {
  const [{ newsletter, store, limits, t }, ip] = await Promise.all([storefront(), currentIp()])
  try {
    limits.checkout.assert(`${store.id}:${ip}:newsletter`)
    await newsletter.subscribe(store.id, String(form.get('contact')), form.get('consent') === 'on')
    return { ok: true }
  } catch (e) {
    return actionError(t, e, 'newsletter')
  }
}
