'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// Layout-only (page chunks import ./ga instead), so every chunk runs all the code it carries.
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
    // Runs once per page load (the layout never unmounts), so no cleanup is needed.
    setTimeout(() => {
      const s = document.createElement('script')
      s.async = true
      s.src = `https://www.googletagmanager.com/gtag/js?id=${ga4}`
      document.head.append(s)
    }, 2000)
  }, [ga4])
  return null
}
