'use server'

import { isDomainError } from '@/modules/shared'
import { currentIp } from '@/server/request'
import { storefront } from '../storefront'

export type Reviewable = {
  items?: { id: string; name: string }[]
  no?: string
  phone?: string
  notFound?: boolean
  limited?: boolean
}

// POST, like tracking: the phone never lands in a URL.
export const findReviewable = async (_: Reviewable, form: FormData): Promise<Reviewable> => {
  const [{ reviews, catalog, store, limits }, ip] = await Promise.all([storefront(), currentIp()])
  try {
    limits.track.assert(`${store.id}:${ip}`)
  } catch {
    return { limited: true }
  }
  const no = String(form.get('no'))
  const phone = String(form.get('phone'))
  const r = await reviews.reviewable(store.id, Number(no), phone)
  if (!r) return { notFound: true }
  const all = await catalog.listProducts(store.id)
  return {
    no,
    phone,
    items: all.filter((p) => r.productIds.includes(p.id)).map((p) => ({ id: p.id, name: p.name })),
  }
}

export const submitReview = async (_: unknown, form: FormData) => {
  const { reviews, store, t } = await storefront()
  try {
    await reviews.submit(store.id, {
      orderNo: Number(form.get('no')),
      phone: String(form.get('phone')),
      productId: String(form.get('productId')),
      rating: Number(form.get('rating')),
      body: String(form.get('body')),
      name: String(form.get('name')),
    })
    return { ok: true }
  } catch (e) {
    if (!isDomainError(e)) console.error('[review]', e)
    return { error: t(isDomainError(e) ? `error.${e.code}` : 'error.unexpected') }
  }
}
