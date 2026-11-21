'use server'

import { currentIp } from '@/server/request'
import { storefront } from '../storefront'

export type Tracked = {
  orderNo: number
  status: string
  placed: string
  items: { name: string; qty: number; total: string }[]
  total: string
}
export type TrackState = { order?: Tracked; notFound?: boolean; limited?: boolean }

// POST (not a GET query) so the shopper's phone never lands in URLs or access logs.
export const trackOrder = async (_: TrackState, form: FormData): Promise<TrackState> => {
  const [{ orders, store, money, t, locale, limits }, ip] = await Promise.all([
    storefront(),
    currentIp(),
  ])
  try {
    limits.track.assert(`${store.id}:${ip}`)
  } catch {
    return { limited: true }
  }
  const o = await orders.trackOrder(store.id, Number(form.get('no')), String(form.get('phone')))
  if (!o) return { notFound: true }
  return {
    order: {
      orderNo: o.orderNo,
      status: t(`status.${o.status}`),
      placed: o.createdAt.toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-GB'),
      items: o.items.map((i) => ({
        name: i.name,
        qty: i.quantity,
        total: money(i.unitPrice * i.quantity),
      })),
      total: money(o.total),
    },
  }
}
