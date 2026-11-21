import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { GaEvent } from '../../ga'
import { storefront } from '../../storefront'

export const metadata: Metadata = { robots: { index: false } }

// Shows only the number the shopper already has; details need the phone (Track page).
export default async function OrderPlaced({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params
  if (!/^\d{1,9}$/.test(no)) notFound()
  const { t } = await storefront()
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <GaEvent name="purchase" params={{ transaction_id: no, currency: 'BDT' }} />
      <h1 className="font-heading text-3xl">{t('success.title')}</h1>
      <p className="text-muted">{t('success.body')}</p>
      <p className="flex flex-col gap-1 rounded-card border border-line bg-surface px-8 py-4">
        <span className="text-sm text-muted">{t('success.orderNo')}</span>
        <span data-testid="order-no" className="font-heading text-3xl">
          #{no}
        </span>
      </p>
      <Link
        href={`/track?no=${no}`}
        className="inline-flex min-h-11 items-center rounded-control bg-button px-6 font-semibold text-button-text"
      >
        {t('success.track')}
      </Link>
    </section>
  )
}
