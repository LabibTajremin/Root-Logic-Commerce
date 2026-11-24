'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { OrderPathId } from '@/modules/site-settings'
import { Icon } from '@/ui/icon'
import { added, AddToCart, OrderNow } from '../../cart-buttons'
import { openCart, type Item } from '../../cart-store'

export type Paths = {
  ids: OrderPathId[]
  /** Digits only, for wa.me; the phone as dialled. */
  whatsapp: string
  phone: string
  url: string
  labels: Record<'addToCart' | 'orderNow' | 'whatsapp' | 'call' | 'waText', string>
}

const link =
  'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-semibold'

/** B2: the owner's order buttons, in the owner's order. */
export const BuyButtons = ({ item, qty, paths: P }: { item: Item; qty: number; paths: Paths }) => {
  const text = P.labels.waText
    .replace('{{product}}', item.name)
    .replace('{{qty}}', String(qty))
    .replace('{{url}}', P.url)
  const button: Record<OrderPathId, React.ReactNode> = {
    cart: <AddToCart item={item} qty={qty} label={P.labels.addToCart} />,
    now: <OrderNow item={item} qty={qty} label={P.labels.orderNow} />,
    whatsapp: (
      <a href={`https://wa.me/${P.whatsapp}?text=${encodeURIComponent(text)}`} className={link}>
        <Icon name="chat" size={18} />
        {P.labels.whatsapp}
      </a>
    ),
    call: (
      <a href={`tel:${P.phone}`} className={link}>
        <Icon name="phone" size={18} />
        {P.labels.call}
      </a>
    ),
  }
  return (
    <div className="flex flex-col gap-2" data-testid="buy-buttons">
      {P.ids.map((id) => (
        <div key={id} className="contents">
          {button[id]}
        </div>
      ))}
    </div>
  )
}

/** A12: quantity stepper with the order buttons for a plain product. */
export const QtyBuy = ({
  item,
  max,
  qtyLabel,
  paths,
}: {
  item: Item
  max: number
  qtyLabel: string
  paths: Paths
}) => {
  const [qty, setQty] = useState(1)
  const step = (d: number) => setQty(Math.max(1, Math.min(max, qty + d)))
  const btn = 'size-11 rounded-control border border-line text-lg'
  return (
    <div className="flex flex-col gap-2 sm:max-w-sm">
      <div role="group" aria-label={qtyLabel} className="flex items-center gap-2">
        <button type="button" aria-label="−" onClick={() => step(-1)} className={btn}>
          −
        </button>
        <output className="w-8 text-center font-semibold">{qty}</output>
        <button type="button" aria-label="+" onClick={() => step(1)} className={btn}>
          +
        </button>
      </div>
      <BuyButtons item={item} qty={qty} paths={paths} />
    </div>
  )
}

/** B2: phone-only bar above the bottom nav: price, the cart, and Order now. */
export const StickyBuy = ({
  item,
  price,
  labels,
}: {
  item: Item
  price: string
  labels: Record<'cart' | 'orderNow', string>
}) => {
  const router = useRouter()
  return (
    <div
      className="fixed inset-x-0 bottom-16 z-30 flex items-center gap-2 border-t border-line bg-surface px-4 py-2 md:hidden"
      data-testid="sticky-buy"
    >
      <span className="flex-1 font-semibold">{price}</span>
      <button
        type="button"
        aria-label={labels.cart}
        onClick={openCart}
        className="inline-flex size-11 items-center justify-center rounded-control border border-line"
      >
        <Icon name="bag" size={20} />
      </button>
      <button
        type="button"
        onClick={() => (added(item, 1), router.push('/checkout'))}
        className="min-h-11 rounded-control bg-button px-5 font-semibold text-button-text"
      >
        {labels.orderNow}
      </button>
    </div>
  )
}
