'use client'

import { useSyncExternalStore } from 'react'
import type { Item } from './cart-store'

/** A10: saved products, on this device only (no account needed). */
const KEY = 'rlc-wishlist'
const EMPTY: Item[] = []
const listeners = new Set<() => void>()
let raw = ''
let items = EMPTY

// Anything that isn't a JSON array (tampered, outdated) is dropped.
const parse = (r: string) => {
  try {
    return (JSON.parse(r) as Item[]).slice()
  } catch {
    return EMPTY
  }
}
const snapshot = () => {
  const r = localStorage.getItem(KEY) ?? '[]'
  if (r !== raw) {
    raw = r
    items = parse(r)
  }
  return items
}
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return listeners.delete.bind(listeners, cb)
}
const save = (next: Item[]) => {
  localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

export const wishlist = {
  toggle(item: Item) {
    const cur = snapshot()
    const rest = cur.filter((i) => i.id !== item.id)
    save(rest.length < cur.length ? rest : [...cur, item])
  },
  remove: (id: string) => save(snapshot().filter((i) => i.id !== id)),
}

export const useWishlist = () => useSyncExternalStore(subscribe, snapshot, () => EMPTY)
