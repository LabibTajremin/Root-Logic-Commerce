'use client'

import Link from 'next/link'
import { Icon } from '@/ui/icon'
import { useWishlist } from './wishlist-store'

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
