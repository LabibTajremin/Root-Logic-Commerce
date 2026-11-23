'use client'

import { useState } from 'react'

export const CopyLink = ({
  url,
  labels,
}: {
  url: string
  labels: { copy: string; copied: string }
}) => {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={() => void navigator.clipboard.writeText(url).then(() => setDone(true))}
      className="min-h-11 rounded-control border border-line px-3"
    >
      <span aria-live="polite">{done ? labels.copied : labels.copy}</span>
    </button>
  )
}
