'use client'

import { useState } from 'react'
import type { ProductOptions, VariantOptions } from '@/modules/catalog'
import { AddToCart, OrderNow } from '../../cart-buttons'
import type { Item } from '../../cart-store'

export type PickerVariant = {
  options: VariantOptions
  price: string
  compareAt: string | null
  stock: number
  item: Item
}
type Labels = Record<'inStock' | 'soldOut' | 'addToCart' | 'orderNow', string>

/** A1: option chips; a value with no in-stock match for the other picks is disabled. */
export const VariantPicker = ({
  options,
  variants,
  labels,
}: {
  options: ProductOptions
  variants: PickerVariant[]
  labels: Labels
}) => {
  const first = variants.find((v) => v.stock > 0) ?? variants[0]!
  const [sel, setSel] = useState(first.options)
  const fits = (v: PickerVariant, name: string, value: string) =>
    options.every((o) => v.options[o.name] === (o.name === name ? value : sel[o.name]))
  const chosen = variants.find((v) => options.every((o) => v.options[o.name] === sel[o.name]))!
  return (
    <div className="flex flex-col gap-4">
      <p className="flex items-baseline gap-3 text-2xl font-semibold" data-testid="variant-price">
        {chosen.price}
        {chosen.compareAt && <s className="text-base font-normal text-muted">{chosen.compareAt}</s>}
      </p>
      {options.map((o) => (
        <fieldset key={o.name} className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-semibold">
            {o.name}: {sel[o.name]}
          </legend>
          <div className="flex flex-wrap gap-2">
            {o.values.map((value) => (
              <label
                key={value}
                className="rlc-chip flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-control border border-line px-3 text-sm has-checked:border-[var(--color-button)] has-checked:font-semibold has-disabled:cursor-not-allowed has-disabled:line-through has-disabled:text-muted"
              >
                <input
                  type="radio"
                  name={o.name}
                  value={value}
                  checked={sel[o.name] === value}
                  disabled={!variants.some((v) => v.stock > 0 && fits(v, o.name, value))}
                  onChange={() => setSel({ ...sel, [o.name]: value })}
                  className="sr-only"
                />
                {value}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      {chosen.stock > 0 ? (
        <div className="flex flex-col gap-2 sm:max-w-sm">
          <p className="text-sm font-semibold">{labels.inStock}</p>
          <AddToCart item={chosen.item} label={labels.addToCart} />
          <OrderNow item={chosen.item} label={labels.orderNow} />
        </div>
      ) : (
        <p className="text-sm font-semibold">{labels.soldOut}</p>
      )}
    </div>
  )
}
