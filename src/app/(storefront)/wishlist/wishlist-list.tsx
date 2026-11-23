'use client'

import Link from 'next/link'
import { formatMoney, type MoneyFormat } from '@/modules/shared'
import { added } from '../cart-buttons'
import { openCart } from '../cart-store'
import { useWishlist, wishlist } from '../wishlist-store'

type Labels = Record<'empty' | 'toCart' | 'remove', string>

export const WishlistList = ({
  labels,
  moneyFormat,
}: {
  labels: Labels
  moneyFormat: MoneyFormat
}) => {
  const items = useWishlist()
  return (
    <>
      <ul className="peer flex flex-col divide-y divide-line">
        {items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-3 py-3">
            <Link href={`/p/${i.slug}`} className="flex-1 font-semibold underline">
              {i.name}
            </Link>
            <span>{formatMoney(i.price, moneyFormat)}</span>
            <button
              type="button"
              onClick={() => (added(i, 1), wishlist.remove(i.id), openCart())}
              className="min-h-11 rounded-control bg-button px-4 text-sm font-semibold text-button-text"
            >
              {labels.toCart}
            </button>
            <button
              type="button"
              onClick={() => wishlist.remove(i.id)}
              className="min-h-11 px-2 text-sm text-danger underline"
            >
              {labels.remove}
            </button>
          </li>
        ))}
      </ul>
      <p className="hidden text-muted peer-empty:block">{labels.empty}</p>
    </>
  )
}
