'use client'

import { useState } from 'react'
import type { ProductOptions, VariantOptions } from '@/modules/catalog'
import { formatMoney, type MoneyFormat } from '@/modules/shared'
import { added, AddToCart, OrderNow } from '../../cart-buttons'
import { openCart, type Item } from '../../cart-store'

export type PickerVariant = {
  options: VariantOptions
  price: string
  compareAt: string | null
  stock: number
  item: Item
}
type Labels = Record<
  | 'inStock'
  | 'soldOut'
  | 'addToCart'
  | 'orderNow'
  | 'addToList'
  | 'selected'
  | 'total'
  | 'addAll'
  | 'remove',
  string
>
type Pick = { v: PickerVariant; qty: number }

/** A1: option chips; a value with no in-stock match for the other picks is disabled. */
export const VariantPicker = ({
  options,
  variants,
  labels,
  moneyFormat,
}: {
  options: ProductOptions
  variants: PickerVariant[]
  labels: Labels
  moneyFormat: MoneyFormat
}) => {
  const first = variants.find((v) => v.stock > 0) ?? variants[0]!
  const [sel, setSel] = useState(first.options)
  const fits = (v: PickerVariant, name: string, value: string) =>
    options.every((o) => v.options[o.name] === (o.name === name ? value : sel[o.name]))
  const chosen = variants.find((v) => options.every((o) => v.options[o.name] === sel[o.name]))!
  // A16: several combinations at once, e.g. White·M ×1 and Maroon·L ×2.
  const [picks, setPicks] = useState<Pick[]>([])
  const setQty = (v: PickerVariant, qty: number) =>
    setPicks(picks.map((p) => (p.v === v ? { v, qty: Math.max(1, Math.min(v.stock, qty)) } : p)))
  const pick = () => {
    const old = picks.find((p) => p.v === chosen)
    if (old) setQty(chosen, old.qty + 1)
    else setPicks([...picks, { v: chosen, qty: 1 }])
  }
  const addAll = () => {
    for (const p of picks) added(p.v.item, p.qty)
    setPicks([])
    openCart()
  }
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
          <AddToCart item={chosen.item} qty={1} label={labels.addToCart} />
          <OrderNow item={chosen.item} qty={1} label={labels.orderNow} />
          <button type="button" onClick={pick} className="min-h-11 text-sm font-semibold underline">
            {labels.addToList}
          </button>
        </div>
      ) : (
        <p className="text-sm font-semibold">{labels.soldOut}</p>
      )}
      {picks.length > 0 && (
        <section aria-label={labels.selected} className="rounded-card border border-line p-3">
          <h2 className="mb-2 text-sm font-semibold">{labels.selected}</h2>
          <ul className="flex flex-col divide-y divide-line">
            {picks.map(({ v, qty }) => (
              <li key={v.item.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="flex-1">{v.item.name}</span>
                <span role="group" aria-label={v.item.name} className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="−"
                    onClick={() => setQty(v, qty - 1)}
                    className="size-11 rounded-control border border-line"
                  >
                    −
                  </button>
                  <output className="w-6 text-center">{qty}</output>
                  <button
                    type="button"
                    aria-label="+"
                    onClick={() => setQty(v, qty + 1)}
                    className="size-11 rounded-control border border-line"
                  >
                    +
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => setPicks(picks.filter((p) => p.v !== v))}
                  className="min-h-11 px-2 text-danger underline"
                >
                  {labels.remove}
                </button>
              </li>
            ))}
          </ul>
          <p className="flex justify-between py-2 font-semibold">
            {labels.total}
            <span data-testid="picks-total">
              {formatMoney(
                picks.reduce((s, p) => s + p.v.item.price * p.qty, 0),
                moneyFormat,
              )}
            </span>
          </p>
          <button
            type="button"
            onClick={addAll}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-control bg-button px-4 text-sm font-semibold text-button-text"
          >
            {labels.addAll}
          </button>
        </section>
      )}
    </div>
  )
}
