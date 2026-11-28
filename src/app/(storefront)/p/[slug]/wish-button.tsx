'use client'

import { Icon } from '@/ui/icon'
import type { Item } from '../../cart-store'
import { useWishlist, wishlist } from '../../wishlist-store'

/** A10: save / unsave this product (product page only). */
export const WishButton = ({
  item,
  labels,
}: {
  item: Item
  labels: { add: string; saved: string }
}) => {
  const items = useWishlist()
  const saved = items.some((i) => i.id === item.id)
  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => wishlist.set(saved ? items.filter((i) => i.id !== item.id) : [...items, item])}
      className="inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold"
    >
      <Icon name="star" size={18} />
      {saved ? labels.saved : labels.add}
    </button>
  )
}
