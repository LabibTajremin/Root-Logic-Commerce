'use client'

import { useEffect } from 'react'
import { eventNames, type TrackEvent } from '@/modules/tracking/client'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    ttq?: { track(name: string, params: unknown, options?: unknown): void }
  }
}

type Params = {
  value?: number
  currency?: string
  items?: ({ item_id: string } & Record<string, unknown>)[]
} & Record<string, unknown>
/** `meta` / `tiktok` false: that platform's server sends this one (Purchase on a later trigger). */
type Options = { eventId?: string; meta?: boolean; tiktok?: boolean }

/**
 * One storefront event to every tool the shop turned on: GA4 (gtag), GTM (dataLayer),
 * Meta Pixel and TikTok Pixel, with the event id the server reuses for the same purchase.
 */
export const track = (name: TrackEvent, params: Params, o: Options = {}) => {
  window.gtag?.('event', name, params)
  ;(window.dataLayer ??= []).push({ event: name, ecommerce: params, event_id: o.eventId })
  const pixel = {
    value: params.value,
    currency: params.currency,
    content_type: 'product',
    content_ids: (params.items ?? []).map((i) => i.item_id),
  }
  const id = o.eventId && { eventID: o.eventId, event_id: o.eventId }
  if (o.meta !== false) window.fbq?.('track', eventNames[name].meta, pixel, id)
  if (o.tiktok !== false) window.ttq?.track(eventNames[name].tiktok, pixel, id)
}

/** Fires one event when the page shows (view_item, begin_checkout, purchase, search). */
export const TrackOnView = ({
  name,
  params,
  options,
}: {
  name: TrackEvent
  params: Params
  options?: Options
}) => {
  useEffect(() => {
    track(name, params, options)
  }, [name, params, options])
  return null
}

/** A contact link (WhatsApp, call, Messenger…) that reports `contact` before it opens. */
export const TrackedLink = (props: React.ComponentProps<'a'>) => (
  <a {...props} onClick={() => track('contact', { method: props.href?.split(':')[0] })} />
)
