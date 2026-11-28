'use client'

import { added } from '../cart-buttons'
import { openCart, type Item } from '../cart-store'

/** A9: puts every item of the combo in the cart; checkout takes the combo saving off. */
export const AddCombo = ({
  items,
  label,
  disabled,
}: {
  items: { item: Item; qty: number }[]
  label: string
  disabled: boolean
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => {
      for (const { item, qty } of items) added(item, qty)
      openCart()
    }}
    className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-button px-4 text-sm font-semibold text-button-text disabled:opacity-50"
  >
    {label}
  </button>
)
