'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { formatMoney } from '@/modules/shared'
import { Icon } from '@/ui/icon'

const KEY = 'rlc-cart'
const lineSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  name: z.string(),
  price: z.number().int().nonnegative(),
  qty: z.number().int().min(1).max(99),
})
export type CartLine = z.infer<typeof lineSchema>
type Item = Omit<CartLine, 'qty'>

const EMPTY: CartLine[] = []
const listeners = new Set<() => void>()
let raw = ''
let lines = EMPTY

// A tampered or outdated cart in storage is dropped instead of breaking the page.
const parse = (r: string) => {
  try {
    return z.array(lineSchema).parse(JSON.parse(r))
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
    const cur = snapshot()
    const i = cur.findIndex((l) => l.id === item.id)
    save(
      i < 0
        ? [...cur, { ...item, qty: 1 }]
        : cur.with(i, { ...cur[i]!, qty: Math.min(99, cur[i]!.qty + 1) }),
    )
  },
  // Only called for a line shown in the drawer, so the id is always in the cart.
  setQty(id: string, qty: number) {
    const cur = snapshot()
    const i = cur.findIndex((l) => l.id === id)
    save(qty < 1 ? cur.toSpliced(i, 1) : cur.with(i, { ...cur[i]!, qty: Math.min(99, qty) }))
  },
  clear: () => save(EMPTY),
}

// Server render and hydration see an empty cart; the stored one appears right after.
export const useCart = () => useSyncExternalStore(subscribe, snapshot, () => EMPTY)

const DRAWER = 'rlc-cart'
const drawer = () => document.getElementById(DRAWER) as HTMLDialogElement
const openCart = () => drawer().showModal()

export const CartButton = ({ label }: { label: string }) => {
  const n = useCart().reduce((s, l) => s + l.qty, 0)
  return (
    <button
      type="button"
      onClick={openCart}
      className="relative inline-flex size-11 items-center justify-center"
    >
      <Icon name="bag" size={22} />
      <span className="sr-only">{label}</span>
      {n > 0 && (
        <span className="absolute right-0.5 top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-button px-1 text-xs font-semibold text-button-text">
          {n}
        </span>
      )}
    </button>
  )
}

export const AddToCart = ({ item, label }: { item: Item; label: string }) => (
  <button
    type="button"
    onClick={() => (cart.add(item), openCart())}
    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-button px-4 text-sm font-semibold text-button-text"
  >
    <Icon name="bag" size={18} />
    {label}
  </button>
)

export const OrderNow = ({ item, label }: { item: Item; label: string }) => {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (cart.add(item), router.push('/checkout'))}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold"
    >
      {label}
    </button>
  )
}

export const CartDrawer = ({
  labels: L,
  banglaDigits,
}: {
  labels: Record<string, string>
  banglaDigits: boolean
}) => {
  const items = useCart()
  const money = (m: number) => formatMoney(m, { banglaDigits })
  const close = () => drawer().close()
  return (
    <dialog
      id={DRAWER}
      aria-label={L.cart}
      className="ml-auto mr-0 h-dvh max-h-dvh w-full max-w-md bg-bg p-0 text-text backdrop:bg-black/40"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-line px-4 py-2">
          <h2 className="font-heading text-xl">{L.cart}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={L.close}
            className="inline-flex size-11 items-center justify-center"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="p-6 text-muted">{L.cartEmpty}</p>
        ) : (
          <ul className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
            {items.map((l) => (
              <li key={l.id} className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1">
                  <Link href={`/p/${l.slug}`} onClick={close} className="font-semibold">
                    {l.name}
                  </Link>
                  <span className="text-sm text-muted">{money(l.price)}</span>
                  <div
                    className="flex items-center gap-1"
                    role="group"
                    aria-label={`${L.qty}: ${l.name}`}
                  >
                    <button
                      type="button"
                      aria-label="−"
                      onClick={() => cart.setQty(l.id, l.qty - 1)}
                      className="inline-flex size-11 items-center justify-center rounded-control border border-line"
                    >
                      <Icon name="minus" size={16} />
                    </button>
                    <output className="min-w-8 text-center font-semibold">{l.qty}</output>
                    <button
                      type="button"
                      aria-label="+"
                      onClick={() => cart.setQty(l.id, l.qty + 1)}
                      className="inline-flex size-11 items-center justify-center rounded-control border border-line"
                    >
                      <Icon name="plus" size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => cart.setQty(l.id, 0)}
                      className="ml-auto min-h-11 px-2 text-sm text-muted underline"
                    >
                      {L.remove}
                    </button>
                  </div>
                </div>
                <span className="font-semibold">{money(l.price * l.qty)}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-auto flex flex-col gap-3 border-t border-line p-4">
          <p className="flex justify-between font-semibold">
            <span>{L.subtotal}</span>
            <span data-testid="cart-subtotal">
              {money(items.reduce((s, l) => s + l.price * l.qty, 0))}
            </span>
          </p>
          {items.length > 0 && (
            <Link
              href="/checkout"
              onClick={close}
              className="inline-flex min-h-11 items-center justify-center rounded-control bg-button px-4 font-semibold text-button-text"
            >
              {L.checkout}
            </Link>
          )}
          <button type="button" onClick={close} className="min-h-11 text-sm font-semibold">
            {L.continue}
          </button>
        </div>
      </div>
    </dialog>
  )
}
