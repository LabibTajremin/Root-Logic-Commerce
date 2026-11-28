'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { timeAgo } from '@/modules/shared'

type Entry = { name: string; area: string; product: string; at: string }

const KEY = 'rlc-proof-off'
// Frequency cap: first after 8 s, each for 6 s, 20 s apart, at most three a visit.
const FIRST = 8_000
const SHOW = 6_000
const GAP = 20_000
const MAX = 3

/** B7: "Rahim from Mirpur ordered Rose Attar · 2 hours ago" — real confirmed orders only. */
export const SocialProof = ({
  locale,
  labels,
}: {
  locale: string
  labels: { text: string; close: string }
}) => {
  const path = usePathname()
  const [shown, setShown] = useState<Entry | null>(null)
  useEffect(() => {
    // Dismissed once on this device: never again.
    if (localStorage.getItem(KEY)) return
    let list: Entry[] = []
    let i = 0
    const next = () => {
      if (i >= Math.min(MAX, list.length)) return
      setShown(list[i++]!)
      setTimeout(() => (setShown(null), setTimeout(next, GAP)), SHOW)
    }
    // Lives in the layout, which never unmounts: the timers need no cleanup.
    setTimeout(async () => {
      list = await (await fetch('/api/social-proof')).json()
      next()
    }, FIRST)
  }, [])
  // Never while the shopper is checking out.
  if (!shown || path.startsWith('/checkout')) return null
  return (
    <div
      role="status"
      data-testid="social-proof"
      className="fixed bottom-24 left-4 z-30 flex max-w-xs items-start gap-3 rounded-card border border-line bg-surface p-3 text-sm shadow-xl lg:bottom-6"
    >
      <p className="flex-1">
        {labels.text
          .replace('{{name}}', shown.name)
          .replace('{{area}}', shown.area)
          .replace('{{product}}', shown.product)}
        <span className="block text-muted">{timeAgo(new Date(shown.at), new Date(), locale)}</span>
      </p>
      <button
        type="button"
        aria-label={labels.close}
        onClick={() => (localStorage.setItem(KEY, '1'), setShown(null))}
        className="inline-flex size-8 items-center justify-center rounded-full"
      >
        ×
      </button>
    </div>
  )
}
