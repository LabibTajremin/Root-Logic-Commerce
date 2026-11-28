import type { Metadata } from 'next'
import { storefront } from '../storefront'
import { TrackForm } from './track-form'

export const metadata: Metadata = { robots: { index: false } }

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ no?: string }>
}) {
  const { t } = await storefront()
  const { no } = await searchParams
  return (
    <section className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-8">
      <h1 className="font-heading text-3xl">{t('track.title')}</h1>
      <p className="text-muted">{t('track.intro')}</p>
      <TrackForm
        initialNo={String(no ?? '')}
        labels={{
          orderNo: t('track.orderNo'),
          phone: t('checkout.phone'),
          submit: t('track.submit'),
          notFound: t('track.notFound'),
          limited: t('error.rate.limited'),
          total: t('checkout.total'),
        }}
      />
    </section>
  )
}
