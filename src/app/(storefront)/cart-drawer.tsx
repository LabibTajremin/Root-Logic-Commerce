'use client'

import Link from 'next/link'
import { formatMoney } from '@/modules/shared'
import { Icon } from '@/ui/icon'
import { cart, DRAWER, openCart, useCart } from './cart-store'

const drawer = () => document.getElementById(DRAWER) as HTMLDialogElement

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
                      disabled={l.qty <= 1}
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
                      onClick={() => cart.remove(l.id)}
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
