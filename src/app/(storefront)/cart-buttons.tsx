'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Icon } from '@/ui/icon'
import { gaEvent } from './ga'
import { cart, openCart, type Item } from './cart-store'

export const added = (item: Item, qty: number) => {
  cart.add(item, qty)
  gaEvent('add_to_cart', {
    currency: 'BDT',
    value: (item.price * qty) / 100,
    items: [{ item_id: item.id, item_name: item.name, price: item.price / 100, quantity: qty }],
  })
}

export const AddToCart = ({ item, qty, label }: { item: Item; qty: number; label: string }) => (
  <button
    type="button"
    onClick={() => (added(item, qty), openCart())}
    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-button px-4 text-sm font-semibold text-button-text"
  >
    <Icon name="bag" size={18} />
    {label}
  </button>
)

export const OrderNow = ({ item, qty, label }: { item: Item; qty: number; label: string }) => {
  const router = useRouter()
  return (
    <button
      type="button"
      onClick={() => (added(item, qty), router.push('/checkout'))}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold"
    >
      {label}
    </button>
  )
}

/** A12: quantity stepper with Add to cart / Order now for a plain product. */
export const QtyBuy = ({
  item,
  max,
  labels,
}: {
  item: Item
  max: number
  labels: Record<'qty' | 'addToCart' | 'orderNow', string>
}) => {
  const [qty, setQty] = useState(1)
  const step = (d: number) => setQty(Math.max(1, Math.min(max, qty + d)))
  const btn = 'size-11 rounded-control border border-line text-lg'
  return (
    <div className="flex flex-col gap-2 sm:max-w-sm">
      <div role="group" aria-label={labels.qty} className="flex items-center gap-2">
        <button type="button" aria-label="−" onClick={() => step(-1)} className={btn}>
          −
        </button>
        <output className="w-8 text-center font-semibold">{qty}</output>
        <button type="button" aria-label="+" onClick={() => step(1)} className={btn}>
          +
        </button>
      </div>
      <AddToCart item={item} qty={qty} label={labels.addToCart} />
      <OrderNow item={item} qty={qty} label={labels.orderNow} />
    </div>
  )
}
