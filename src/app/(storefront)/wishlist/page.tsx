import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { storefront } from '../storefront'
import { WishlistList } from './wishlist-list'

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false } }

/** A10: what this device saved. */
export default async function WishlistPage() {
  const { t, on, moneyFormat } = await storefront()
  if (!on('wishlist')) notFound()
  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <h1 className="font-heading text-3xl">{t('wishlist.title')}</h1>
      <WishlistList
        labels={{
          empty: t('wishlist.empty'),
          toCart: t('wishlist.toCart'),
          remove: t('shop.remove'),
        }}
        moneyFormat={moneyFormat}
      />
    </section>
  )
}
