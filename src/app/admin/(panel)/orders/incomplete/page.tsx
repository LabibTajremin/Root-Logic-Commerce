import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { convertDraft, discardDraft } from './actions'

export const metadata: Metadata = { title: 'Incomplete orders' }

/** C1: shoppers who typed a phone at checkout but did not order. Not orders: no number, no revenue. */
export default async function IncompletePage() {
  const { drafts, store, t } = await adminContext('orders.manage')
  const rows = await drafts.list(store.id)
  return (
    <>
      <Link href="/admin/orders" className="text-sm font-semibold underline">
        {t('orders.title')}
      </Link>
      <h1 className="font-heading text-3xl">{t('drafts.title')}</h1>
      <p className="text-sm text-muted">{t('drafts.hint')}</p>
      <ul className="peer flex flex-col gap-3">
        {rows.map((d) => (
          <li key={d.id}>
            <Card className="flex flex-col gap-3">
              <p className="flex flex-wrap gap-x-3">
                <span className="font-semibold">{d.phone}</span>
                <span>{d.name}</span>
                <span className="text-sm text-muted">
                  {d.updatedAt.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                </span>
              </p>
              <p className="text-sm text-muted">
                {[d.address, d.area, d.district].filter(Boolean).join(', ')} ·{' '}
                {t('drafts.items', { n: d.items.reduce((n, i) => n + i.quantity, 0) })}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`tel:${d.phone}`}
                  className="inline-flex min-h-11 items-center rounded-control border border-line px-4 text-sm font-semibold"
                >
                  {t('drafts.call')}
                </a>
                <a
                  href={`https://wa.me/88${d.phone}`}
                  className="inline-flex min-h-11 items-center rounded-control border border-line px-4 text-sm font-semibold"
                >
                  WhatsApp
                </a>
                <ActionForm action={convertDraft}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="min-h-11 rounded-control bg-button px-4 text-sm font-semibold text-button-text">
                    {t('drafts.convert')}
                  </button>
                </ActionForm>
                <ActionForm action={discardDraft}>
                  <input type="hidden" name="id" value={d.id} />
                  <button className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold text-danger">
                    {t('drafts.discard')}
                  </button>
                </ActionForm>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="hidden peer-empty:block">
        <p className="text-muted">{t('drafts.empty')}</p>
      </Card>
    </>
  )
}
