'use client'

import { useSyncExternalStore } from 'react'
import { SOUND_KEY } from './bell'

const subscribe = (cb: () => void) => {
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

/** The chime is per device: an owner may want it on the shop PC but not on their phone. */
export const SoundToggle = ({ label }: { label: string }) => {
  const on = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem(SOUND_KEY) === 'on',
    () => false,
  )
  return (
    <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
      {label}
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => {
          localStorage.setItem(SOUND_KEY, e.target.checked ? 'on' : 'off')
          // Same-tab writes don't fire `storage`; announce it so the checkbox re-reads.
          window.dispatchEvent(new StorageEvent('storage'))
        }}
        className="size-6 accent-[var(--color-accent)]"
      />
    </label>
  )
}
