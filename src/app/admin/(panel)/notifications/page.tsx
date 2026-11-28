import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { markAllNoticesRead, markNoticeRead } from './actions'
import { SoundToggle } from './sound-toggle'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const { notifications, store, t } = await adminContext('orders.manage')
  const list = await notifications.list(store.id)
  return (
    <>
      <h1 className="font-heading text-3xl">{t('notices.title')}</h1>
      <Card>
        <SoundToggle label={t('notices.sound')} />
      </Card>
      <Card className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{t('notices.orders')}</h2>
          <ActionForm action={markAllNoticesRead}>
            <Button type="submit" variant="secondary">
              {t('notices.markAll')}
            </Button>
          </ActionForm>
        </div>
        <ul className="peer flex flex-col divide-y divide-line">
          {list.map((n) => (
            <li
              key={n.id}
              data-testid={`notice-${n.data.orderNo}`}
              className="flex min-h-14 items-center gap-3"
            >
              <Link href={`/admin/orders/${n.ref}`} className="flex-1 font-semibold">
                {t('notices.newOrder', { no: n.data.orderNo })}
              </Link>
              <time className="text-xs text-muted" dateTime={n.createdAt.toISOString()}>
                {n.createdAt.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
              </time>
              {n.readAt ? (
                <Badge tone="neutral">{t('notices.read')}</Badge>
              ) : (
                <ActionForm action={markNoticeRead}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="min-h-11 text-sm font-semibold underline">
                    {t('notices.markRead')}
                  </button>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
        {/* Empty state without a branch: shown only while the list above has no items. */}
        <p className="hidden text-sm text-muted peer-empty:block">{t('notices.none')}</p>
      </Card>
    </>
  )
}
