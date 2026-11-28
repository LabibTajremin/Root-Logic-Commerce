'use client'

import { useState } from 'react'
import { formatMoney, type MoneyFormat } from '@/modules/shared'
import { added } from '../../cart-buttons'
import { openCart, type Item } from '../../cart-store'

type Labels = Record<'title' | 'total' | 'add' | 'thisItem', string>

/** A8: tick what to add with this product; the total follows; one tap adds them all. */
export const BoughtTogether = ({
  me,
  others,
  labels,
  moneyFormat,
}: {
  me: Item
  others: Item[]
  labels: Labels
  moneyFormat: MoneyFormat
}) => {
  const all = [me, ...others]
  const [on, setOn] = useState(() => new Set(all.map((i) => i.id)))
  const picked = all.filter((i) => on.has(i.id))
  const toggle = (id: string) => {
    const next = new Set(on)
    if (!next.delete(id)) next.add(id)
    setOn(next)
  }
  return (
    <section
      aria-labelledby="together"
      className="flex flex-col gap-3 rounded-card border border-line p-4"
    >
      <h2 id="together" className="font-heading text-xl">
        {labels.title}
      </h2>
      <ul className="flex flex-col gap-1">
        {all.map((i) => (
          <li key={i.id}>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={on.has(i.id)}
                onChange={() => toggle(i.id)}
                className="size-5"
              />
              <span className="flex-1">{i === me ? `${labels.thisItem}: ${i.name}` : i.name}</span>
              <span className="font-semibold">{formatMoney(i.price, moneyFormat)}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="flex justify-between font-semibold">
        {labels.total}
        <span data-testid="together-total">
          {formatMoney(
            picked.reduce((s, i) => s + i.price, 0),
            moneyFormat,
          )}
        </span>
      </p>
      <button
        type="button"
        disabled={picked.length === 0}
        onClick={() => {
          for (const i of picked) added(i, 1)
          openCart()
        }}
        className="inline-flex min-h-11 items-center justify-center rounded-control bg-button px-4 text-sm font-semibold text-button-text disabled:opacity-60"
      >
        {labels.add}
      </button>
    </section>
  )
}
