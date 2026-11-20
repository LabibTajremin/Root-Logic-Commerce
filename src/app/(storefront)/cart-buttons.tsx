'use client'

import { useRouter } from 'next/navigation'
import { Icon } from '@/ui/icon'
import { gaEvent } from './analytics'
import { cart, openCart, type Item } from './cart-store'

const added = (item: Item) => {
  cart.add(item)
  gaEvent('add_to_cart', {
    currency: 'BDT',
    value: item.price / 100,
    items: [{ item_id: item.id, item_name: item.name, price: item.price / 100, quantity: 1 }],
  })
}

export const AddToCart = ({ item, label }: { item: Item; label: string }) => (
  <button
    type="button"
    onClick={() => (added(item), openCart())}
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
      onClick={() => (added(item), router.push('/checkout'))}
      className="inline-flex min-h-11 w-full items-center justify-center rounded-control border border-line bg-surface px-4 text-sm font-semibold"
    >
      {label}
    </button>
  )
}
