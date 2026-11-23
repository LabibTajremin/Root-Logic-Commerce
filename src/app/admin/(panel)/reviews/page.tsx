import type { Metadata } from 'next'
import Link from 'next/link'
import { reviewStatuses, type ReviewStatus } from '@/modules/reviews'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { moderateReview, replyReview } from './actions'

export const metadata: Metadata = { title: 'Reviews' }

const tone = { pending: 'warning', approved: 'success', rejected: 'neutral' } as const

/** A7: moderation queue — approve, hide, reply. */
export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const { reviews, catalog, store, t } = await adminContext('products.manage')
  const filter = reviewStatuses.find((s) => s === status)
  const [list, products] = await Promise.all([
    reviews.queue(store.id, filter),
    catalog.listProducts(store.id),
  ])
  const nameOf = new Map(products.map((p) => [p.id, p.name]))
  const tabs: (ReviewStatus | undefined)[] = [undefined, ...reviewStatuses]
  return (
    <>
      <h1 className="font-heading text-3xl">{t('reviews.adminTitle')}</h1>
      <p className="text-sm text-muted">{t('reviews.adminHint')}</p>
      <nav aria-label={t('reviews.adminTitle')} className="flex flex-wrap gap-2">
        {tabs.map((s) => (
          <Link
            key={s ?? 'all'}
            href={s ? `/admin/reviews?status=${s}` : '/admin/reviews'}
            aria-current={s === filter ? 'page' : undefined}
            className="min-h-11 content-center rounded-full border border-line px-4 text-sm font-semibold aria-[current=page]:bg-button aria-[current=page]:text-button-text"
          >
            {t(s ? `reviews.status_${s}` : 'reviews.all')}
          </Link>
        ))}
      </nav>
      <ul className="peer flex flex-col gap-3">
        {list.map((r) => (
          <li key={r.id}>
            <Card className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{nameOf.get(r.productId)}</span>
                <Badge tone={tone[r.status]}>{t(`reviews.status_${r.status}`)}</Badge>
              </div>
              <p>
                <span aria-label={t('reviews.stars', { n: r.rating })}>{'★'.repeat(r.rating)}</span>{' '}
                <span className="font-semibold">{r.name}</span>
              </p>
              <p className="whitespace-pre-line text-muted">{r.body}</p>
              <ActionForm action={moderateReview} className="flex gap-2">
                <input type="hidden" name="id" value={r.id} />
                <Button type="submit" name="status" value="approved" icon="check">
                  {t('reviews.approve')}
                </Button>
                <Button type="submit" name="status" value="rejected" variant="secondary">
                  {t('reviews.reject')}
                </Button>
              </ActionForm>
              <ActionForm
                action={replyReview}
                saved={t('common.saved')}
                className="flex flex-col gap-2"
              >
                <input type="hidden" name="id" value={r.id} />
                <label htmlFor={`reply-${r.id}`} className="text-sm font-semibold">
                  {t('reviews.replyLabel')}
                </label>
                <textarea
                  id={`reply-${r.id}`}
                  name="reply"
                  rows={2}
                  defaultValue={r.reply ?? ''}
                  className="rounded-control border border-line bg-surface p-3"
                />
                <Button type="submit" variant="secondary">
                  {t('reviews.saveReply')}
                </Button>
              </ActionForm>
            </Card>
          </li>
        ))}
      </ul>
      <p className="hidden text-muted peer-empty:block">{t('reviews.empty')}</p>
    </>
  )
}
