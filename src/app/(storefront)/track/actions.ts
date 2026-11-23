'use server'

import { formatDate } from '@/modules/shared'
import { currentIp } from '@/server/request'
import { storefront } from '../storefront'
import { lineName } from '@/modules/orders'

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
  const [{ orders, store, money, t, locale, limits, business }, ip] = await Promise.all([
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
      placed: formatDate(o.createdAt, {
        format: business.dateFormat,
        locale,
        banglaDigits: business.banglaDigits,
      }),
      items: o.items.map((i) => ({
        name: lineName(i),
        qty: i.quantity,
        total: money(i.unitPrice * i.quantity),
      })),
      total: money(o.total),
    },
  }
}
