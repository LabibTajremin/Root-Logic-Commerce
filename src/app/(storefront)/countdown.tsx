'use client'

import { useEffect, useState } from 'react'
import { countdownText } from '@/modules/landing/client'

/** H5/B11: time left on an offer; filled in after hydration so server and browser agree. */
export const Countdown = ({
  endsAt,
  labels,
}: {
  endsAt: string
  labels: { left: string; ended: string }
}) => {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    const tick = () => setLeft(new Date(endsAt).getTime() - Date.now())
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [endsAt])
  return (
    <p role="timer" className="min-h-7 text-lg font-semibold text-danger">
      {left !== null && countdownText(left, labels)}
    </p>
  )
}
