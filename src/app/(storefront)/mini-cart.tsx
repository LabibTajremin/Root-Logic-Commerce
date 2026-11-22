'use client'

import { formatMoney, type MoneyFormat } from '@/modules/shared'
import { Icon } from '@/ui/icon'
import { openCart, useCart } from './cart-store'

/**
 * B15: a count + total pill that opens the cart drawer, shown only while the cart has
 * items — above the bottom nav on phones, bottom-left on larger screens.
 */
export const MiniCart = ({
  labels,
  moneyFormat,
}: {
  labels: { region: string; items: string; view: string }
  moneyFormat: MoneyFormat
}) => {
  const lines = useCart()
  const n = lines.reduce((s, l) => s + l.qty, 0)
  if (n === 0) return null
  const total = formatMoney(
    lines.reduce((s, l) => s + l.price * l.qty, 0),
    moneyFormat,
  )
  return (
    <aside aria-label={labels.region} className="fixed bottom-20 left-4 z-30 lg:bottom-6">
      <button
        type="button"
        onClick={openCart}
        className="flex min-h-12 items-center gap-2 rounded-full bg-button px-4 text-sm font-semibold text-button-text shadow-lg"
      >
        <Icon name="bag" size={18} />
        {labels.items.replace('{{n}}', String(n))} · {total} · {labels.view}
      </button>
    </aside>
  )
}
