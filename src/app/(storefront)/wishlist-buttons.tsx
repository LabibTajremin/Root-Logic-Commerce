'use client'

import Link from 'next/link'
import { Icon } from '@/ui/icon'
import type { Item } from './cart-store'
import { useWishlist, wishlist } from './wishlist-store'

/** Header link with the saved count. */
export const WishlistLink = ({ label }: { label: string }) => {
  const n = useWishlist().length
  return (
    <Link href="/wishlist" className="relative inline-flex size-11 items-center justify-center">
      <Icon name="star" size={22} />
      <span className="sr-only">
        {label} ({n})
      </span>
      <span
        aria-hidden
        className="absolute right-0.5 top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-button px-1 text-xs font-semibold text-button-text empty:hidden"
      >
        {n || ''}
      </span>
    </Link>
  )
}

export const WishButton = ({
  item,
  labels,
}: {
  item: Item
  labels: { add: string; saved: string }
}) => {
  const saved = useWishlist().some((i) => i.id === item.id)
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => wishlist.toggle(item)}
      className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold"
    >
      <Icon name="star" size={18} />
      {saved ? labels.saved : labels.add}
    </button>
  )
}
