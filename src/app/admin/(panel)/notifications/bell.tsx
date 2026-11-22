'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/ui/icon'
import { pollNotices } from './actions'

export const SOUND_KEY = 'rlc-order-sound'

// A short two-tone chime, synthesised: no audio file to download.
const chime = () => {
  const ctx = new AudioContext()
  for (const [i, f] of [880, 1320].entries()) {
    const o = ctx.createOscillator()
    o.frequency.value = f
    o.connect(ctx.destination)
    o.start(ctx.currentTime + i * 0.15)
    o.stop(ctx.currentTime + i * 0.15 + 0.12)
  }
}

/** F2: polls every 15 s (and when the tab regains focus); new orders show a toast, optionally a chime. */
export const Bell = ({
  unread: initial,
  latestId,
  labels,
}: {
  unread: number
  latestId: string | null
  labels: { bell: string; newOrder: string; open: string }
}) => {
  const [unread, setUnread] = useState(initial)
  const [toast, setToast] = useState<{ orderNo: number; href: string } | null>(null)
  const seen = useRef(latestId)
  useEffect(() => {
    const poll = async () => {
      const r = await pollNotices()
      setUnread(r.unread)
      if (!r.latest || r.latest.id === seen.current) return
      seen.current = r.latest.id
      setToast(r.latest)
      if (localStorage.getItem(SOUND_KEY) === 'on') chime()
    }
    const timer = setInterval(poll, 15_000)
    window.addEventListener('focus', poll)
    return () => {
      clearInterval(timer)
      window.removeEventListener('focus', poll)
    }
  }, [])
  return (
    <>
      <Link
        href="/admin/notifications"
        aria-label={`${labels.bell} (${unread})`}
        className="relative inline-flex size-11 items-center justify-center rounded-control hover:bg-soft"
      >
        <Icon name="alert" />
        <span
          data-testid="bell-count"
          className="absolute right-1 top-1 min-w-5 rounded-full bg-danger px-1 text-center text-xs font-semibold text-white"
          hidden={unread === 0}
        >
          {unread}
        </span>
      </Link>
      {toast && (
        <div
          role="status"
          className="fixed bottom-24 right-4 z-50 flex items-center gap-3 rounded-card bg-text px-4 py-3 text-sm text-bg shadow-xl lg:bottom-6"
        >
          <span>{labels.newOrder.replace('{{no}}', String(toast.orderNo))}</span>
          <Link
            href={toast.href}
            onClick={() => setToast(null)}
            className="font-semibold underline"
          >
            {labels.open}
          </Link>
        </div>
      )}
    </>
  )
}
