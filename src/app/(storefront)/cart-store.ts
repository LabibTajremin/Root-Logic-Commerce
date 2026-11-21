'use client'

import { useSyncExternalStore } from 'react'
const KEY = 'rlc-cart'
export type CartLine = { id: string; slug: string; name: string; price: number; qty: number }
export type Item = Omit<CartLine, 'qty'>

const EMPTY: CartLine[] = []
const listeners = new Set<() => void>()
let raw = ''
let lines = EMPTY

// Storage that isn't a JSON array (tampered, outdated) throws here and is dropped. Line
// contents need no checking in the browser: checkout re-validates every id and quantity.
const parse = (r: string) => {
  try {
    return (JSON.parse(r) as CartLine[]).slice()
  } catch {
    return EMPTY
  }
}
const snapshot = () => {
  const r = localStorage.getItem(KEY) ?? '[]'
  if (r !== raw) {
    raw = r
    lines = parse(r)
  }
  return lines
}
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return listeners.delete.bind(listeners, cb)
}
const save = (next: CartLine[]) => {
  localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((l) => l())
}

export const cart = {
  add(item: Item) {
    // Append a zero line, bump whichever line matches first (the existing one, else the
    // new one), then drop the unused zero line: order is kept, no special cases.
    const next = [...snapshot(), { ...item, qty: 0 }]
    const i = next.findIndex((l) => l.id === item.id)
    save(
      next.with(i, { ...next[i]!, qty: Math.min(99, next[i]!.qty + 1) }).filter((l) => l.qty > 0),
    )
  },
  // Only called for lines shown in the drawer, so the id is always in the cart.
  setQty(id: string, qty: number) {
    const cur = snapshot()
    const i = cur.findIndex((l) => l.id === id)
    save(cur.with(i, { ...cur[i]!, qty: Math.max(1, Math.min(99, qty)) }))
  },
  remove(id: string) {
    const cur = snapshot()
    save(
      cur.toSpliced(
        cur.findIndex((l) => l.id === id),
        1,
      ),
    )
  },
  clear: () => save(EMPTY),
}

// Server render and hydration see an empty cart; the stored one appears right after.
export const useCart = () => useSyncExternalStore(subscribe, snapshot, () => EMPTY)

// The drawer lives in the layout; buttons on any page open it by id.
export const DRAWER = 'rlc-cart'
export const openCart = () => (document.getElementById(DRAWER) as HTMLDialogElement).showModal()
