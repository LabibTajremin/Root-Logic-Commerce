'use client'

import { useSyncExternalStore } from 'react'
import { storedList } from '@/ui/stored-list'
import type { Item } from './cart-store'

/** A10: saved products, on this device only (no account needed). */
const KEY = 'rlc-wishlist'
const EMPTY: Item[] = []
const listeners = new Set<() => void>()
let raw = ''
let items = EMPTY

const snapshot = () => {
  const r = localStorage.getItem(KEY) ?? '[]'
  if (r !== raw) {
    raw = r
    items = storedList(r, EMPTY)
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

// Branch-free on purpose: this module sits in several page chunks (coverage counts split).
export const wishlist = {
  set: save,
  remove: (id: string) => save(snapshot().filter((i) => i.id !== id)),
}

export const useWishlist = () => useSyncExternalStore(subscribe, snapshot, () => EMPTY)
