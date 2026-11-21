import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { nextStatuses } from '@/modules/orders'
import { isUuid } from '@/modules/shared'
import { ActionForm } from '@/ui/action-form'
import { Icon } from '@/ui/icon'
import { Badge, Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { changeStatus } from '../actions'
import { TONE } from '../tone'

export const metadata: Metadata = { title: 'Order' }

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const { orders, store, t, money } = await adminContext('orders.manage')
  const o = await orders.getOrder(store.id, id)
  if (!o) notFound()
  const wa = `https://wa.me/88${o.shipPhone}`
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl">#{o.orderNo}</h1>
        <Badge tone={TONE[o.status]}>{t(`status.${o.status}`)}</Badge>
        <Link
          href={`/admin/orders/${o.id}/invoice`}
          className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-control border border-line px-4 text-sm font-semibold"
        >
          <Icon name="receipt" size={18} />
          {t('order.invoice')}
        </Link>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-5">
          {nextStatuses(o.status).length > 0 && (
            <Card className="flex flex-col gap-3">
              {o.status === 'PENDING' && (
                <p className="text-sm text-accent-ink">{t('order.stockHint')}</p>
              )}
              <ActionForm action={changeStatus} className="flex flex-col gap-3">
                <input type="hidden" name="id" value={o.id} />
                <div className="flex flex-wrap gap-2">
                  {nextStatuses(o.status).map((s) => (
                    <button
                      key={s}
                      name="to"
                      value={s}
                      className={`min-h-11 flex-1 rounded-control px-4 text-sm font-semibold ${s === 'CANCELLED' ? 'border border-line text-danger' : 'bg-button text-button-text'}`}
                    >
                      {t(`action.${s}`)}
                    </button>
                  ))}
                </div>
              </ActionForm>
            </Card>
          )}
          <Card>
            <h2 className="mb-3 font-semibold">{t('order.items')}</h2>
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={i.name} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {i.name}
                    <span className="block text-xs text-muted">
                      {t('order.qty', { n: i.quantity })}
                    </span>
                  </span>
                  <span className="font-semibold">{money(i.unitPrice * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 grid grid-cols-2 gap-1 border-t border-line pt-3 text-sm">
              <dt className="text-muted">{t('order.subtotal')}</dt>
              <dd className="text-right">{money(o.subtotal)}</dd>
              <dt className="text-muted">
                {t('order.delivery')} · {o.deliveryZone}
              </dt>
              <dd className="text-right">{money(o.deliveryCharge)}</dd>
              <dt className="font-semibold">
                {t('order.total')} · {t('order.cod')}
              </dt>
              <dd className="text-right text-lg font-semibold" data-testid="order-total">
                {money(o.total)}
              </dd>
            </dl>
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{t('order.activity')}</h2>
            <ol className="flex flex-col gap-2 text-sm" data-testid="order-events">
              {o.events.map((e) => (
                <li key={e.createdAt.toISOString() + e.toStatus} className="flex gap-2">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                  <span>
                    {t(`status.${e.toStatus}`)}
                    <span className="block text-xs text-muted">
                      {e.createdAt.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        <div className="flex flex-col gap-5">
          <Card className="flex flex-col gap-2">
            <h2 className="font-semibold">{t('order.customer')}</h2>
            <p className="font-semibold">{o.shipName}</p>
            <p className="text-sm">{o.shipPhone}</p>
            <p className="text-sm text-muted">
              {o.shipAddress}, {o.shipArea}, {o.shipDistrict}
            </p>
            <div className="flex gap-2">
              <a
                href={`tel:${o.shipPhone}`}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border border-line text-sm font-semibold"
              >
                <Icon name="phone" size={18} />
                {t('order.call')}
              </a>
              <a
                href={wa}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-control border border-line text-sm font-semibold"
              >
                <Icon name="chat" size={18} />
                {t('order.whatsapp')}
              </a>
            </div>
          </Card>
          {o.note && (
            <Card>
              <h2 className="mb-2 font-semibold">{t('order.note')}</h2>
              <p className="text-sm text-muted">{o.note}</p>
            </Card>
          )}
        </div>
      </div>
    </>
  )
}
