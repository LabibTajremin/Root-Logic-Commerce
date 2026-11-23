import type { Metadata } from 'next'
import { storefront } from '../storefront'
import { ReviewForm } from './review-form'

export const metadata: Metadata = { title: 'Review your order', robots: { index: false } }

export default async function ReviewPage() {
  const { t } = await storefront()
  const k = (keys: string[]) => Object.fromEntries(keys.map((x) => [x, t(`review.${x}`)]))
  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
      <h1 className="font-heading text-3xl">{t('review.title')}</h1>
      <p className="text-muted">{t('review.intro')}</p>
      <ReviewForm
        labels={
          k([
            'orderNo',
            'phone',
            'find',
            'notFound',
            'limited',
            'rating',
            'body',
            'name',
            'send',
            'thanks',
            'star',
          ]) as Parameters<typeof ReviewForm>[0]['labels']
        }
      />
    </section>
  )
}
