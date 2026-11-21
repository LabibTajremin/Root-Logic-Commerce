'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

/** GA4 ecommerce event; a no-op when the store has no Measurement ID. */
export const gaEvent = (name: string, params: Record<string, unknown>) =>
  window.gtag?.('event', name, params)

/** Fires one GA4 event when the page shows (view_item, begin_checkout, purchase). */
export const GaEvent = ({ name, params }: { name: string; params: Record<string, unknown> }) => {
  useEffect(() => {
    gaEvent(name, params)
  }, [name, params])
  return null
}
