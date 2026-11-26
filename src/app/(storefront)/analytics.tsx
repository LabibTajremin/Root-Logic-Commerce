'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// Layout-only (page chunks import ./ga instead), so every chunk runs all the code it carries.
type Tags = {
  ga4: string[]
  gtm: string
  metaPixels: string[]
  tiktok: string | null
  clarity: string
}

/** Every id here passed the settings schema (digits / [A-Z0-9-]), so it is safe inside a script. */
const inline = (code: string) => {
  const s = document.createElement('script')
  s.text = code
  document.head.append(s)
}
const external = (src: string) => {
  const s = document.createElement('script')
  s.async = true
  s.src = src
  document.head.append(s)
}

/**
 * First-party page views on every route change, plus the shop's tags (H1/H2/H3). Each tool's
 * own queue starts at once, so no event is lost; the libraries load later, off the critical path.
 */
export const Analytics = ({ tags }: { tags: Tags }) => {
  const path = usePathname()
  useEffect(() => {
    navigator.sendBeacon('/api/beacon', path)
  }, [path])
  // A refreshed layout sends an equal but new object: only a real change may boot tags again.
  const key = JSON.stringify(tags)
  useEffect(() => {
    const tags = JSON.parse(key) as Tags
    const later: string[] = []
    const [ga4] = tags.ga4
    if (ga4) {
      // Google's own snippet (gtag.js needs real Arguments objects).
      inline(
        `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());${tags.ga4.map((id) => `gtag('config',${JSON.stringify(id)})`).join(';')}`,
      )
      later.push(`https://www.googletagmanager.com/gtag/js?id=${ga4}`)
    }
    if (tags.gtm) {
      inline(
        `window.dataLayer=window.dataLayer||[];dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'})`,
      )
      later.push(`https://www.googletagmanager.com/gtm.js?id=${tags.gtm}`)
    }
    if (tags.metaPixels.length > 0) {
      inline(
        `!function(f){if(f.fbq)return;var n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[]}(window);${tags.metaPixels.map((id) => `fbq('init',${JSON.stringify(id)})`).join(';')};fbq('track','PageView')`,
      )
      later.push('https://connect.facebook.net/en_US/fbevents.js')
    }
    if (tags.tiktok) {
      // TikTok's own queue stub; its `load` adds the library when it runs below.
      inline(
        `!function(w,t){w.TiktokAnalyticsObject=t;var q=w[t]=w[t]||[];q.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];q.setAndDefer=function(o,m){o[m]=function(){o.push([m].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<q.methods.length;i++)q.setAndDefer(q,q.methods[i]);q.load=function(e){var r="https://analytics.tiktok.com/i18n/pixel/events.js";q._i=q._i||{};q._i[e]=[];q._i[e]._u=r;q._t=q._t||{};q._t[e]=+new Date;var s=document.createElement("script");s.async=!0;s.src=r+"?sdkid="+e+"&lib="+t;document.head.appendChild(s)}}(window,'ttq');ttq.page()`,
      )
      later.push(`tiktok:${tags.tiktok}`)
    }
    if (tags.clarity) {
      inline(`window.clarity=window.clarity||function(){(clarity.q=clarity.q||[]).push(arguments)}`)
      later.push(`https://www.clarity.ms/tag/${tags.clarity}`)
    }
    // Runs once per page load (the layout never unmounts), so no cleanup is needed.
    setTimeout(() => {
      for (const src of later)
        if (src.startsWith('tiktok:')) inline(`ttq.load(${JSON.stringify(src.slice(7))})`)
        else external(src)
    }, 2000)
  }, [key])
  return null
}
