'use client'

import { usePathname } from 'next/navigation'
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

/** First-party page views on every route change, plus GA4 when configured. */
export const Analytics = ({ ga4 }: { ga4: string | null }) => {
  const path = usePathname()
  useEffect(() => {
    navigator.sendBeacon('/api/beacon', path)
  }, [path])
  useEffect(() => {
    if (!ga4) return
    // Google's own snippet (gtag.js needs real Arguments objects): the queue works at once,
    // events are kept, and the library itself loads later, off the critical path.
    const boot = document.createElement('script')
    boot.text = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(ga4)})`
    document.head.append(boot)
    const t = setTimeout(() => {
      const s = document.createElement('script')
      s.async = true
      s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`
      document.head.append(s)
    }, 2000)
    return () => clearTimeout(t)
  }, [ga4])
  return null
}

/** Fires one GA4 event when the page shows (view_item, begin_checkout, purchase). */
export const GaEvent = ({ name, params }: { name: string; params: Record<string, unknown> }) => {
  useEffect(() => {
    gaEvent(name, params)
  }, [name, params])
  return null
}
