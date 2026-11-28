'use client'

import { useState, type ComponentProps } from 'react'
import { formatMoney } from '@/modules/shared'
import type { Item } from '../../cart-store'
import { CheckoutForm } from '../../checkout/checkout-form'

type Pack = { qty: number; price: number }

/** H5: pick a pack, then order it right here — the shopper's cart is left alone. */
export const LandingOrder = ({
  id,
  item,
  packs,
  labels,
  checkout,
}: {
  id: string
  item: Item
  /** Pack prices the server set from the page (it checks them again when placing). */
  packs: Pack[]
  labels: { packs: string; pcs: string; save: string }
  checkout: Omit<ComponentProps<typeof CheckoutForm>, 'landing'>
}) => {
  const [qty, setQty] = useState(packs[0]?.qty ?? 1)
  const money = (m: number) => formatMoney(m, checkout.moneyFormat)
  const full = item.price * qty
  const pack = packs.find((p) => p.qty === qty)
  const saving = pack ? Math.max(0, full - pack.price) : 0
  return (
    <div className="flex flex-col gap-4">
      {packs.length > 0 && (
        <fieldset className="grid gap-3 sm:grid-cols-2">
          <legend className="mb-2 font-semibold">{labels.packs}</legend>
          {packs.map((p) => (
            <label
              key={p.qty}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-card border border-line bg-surface p-4 has-[:checked]:border-accent has-[:checked]:ring-2 has-[:checked]:ring-accent"
            >
              <input
                type="radio"
                name="pack"
                checked={qty === p.qty}
                onChange={() => setQty(p.qty)}
                className="size-5"
              />
              <span className="flex-1 font-semibold">
                {labels.pcs.replace('{{n}}', String(p.qty))}
              </span>
              <span className="flex flex-col items-end">
                <span className="font-semibold">{money(p.price)}</span>
                {item.price * p.qty > p.price && (
                  <span className="text-xs text-success">
                    {labels.save.replace('{{amount}}', money(item.price * p.qty - p.price))}
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <CheckoutForm
        {...checkout}
        landing={{
          id,
          line: { ...item, qty },
          saving,
          setQty: (n) => setQty(Math.max(1, Math.min(20, n))),
        }}
      />
    </div>
  )
}
