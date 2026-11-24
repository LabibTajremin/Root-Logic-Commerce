import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lineName, nextStatuses, returnReasons } from '@/modules/orders'
import { isUuid } from '@/modules/shared'
import { ActionForm } from '@/ui/action-form'
import { Icon } from '@/ui/icon'
import { Badge, Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { changeStatus, recordReturn, restoreOrder, trashOrder } from '../actions'
import { TONE } from '../tone'

export const metadata: Metadata = { title: 'Order' }

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const { orders, store, t, money } = await adminContext('orders.manage')
  const o = await orders.getOrder(store.id, id)
  if (!o) notFound()
  const wa = `https://wa.me/88${o.shipPhone}`
  const returns = await orders.listReturns(store.id, o.id)
  const itemName = new Map(o.items.map((i) => [i.id, lineName(i)]))
  const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl">#{o.orderNo}</h1>
        <Badge tone={TONE[o.status]}>{t(`status.${o.status}`)}</Badge>
        {o.scheduledFor && (
          <span className="text-sm text-muted" data-testid="order-scheduled">
            {t('order.scheduledFor', {
              date: o.scheduledFor.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' }),
            })}
          </span>
        )}
        {o.deletedAt && <Badge tone="neutral">{t('order.inTrash')}</Badge>}
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
                {nextStatuses(o.status).includes('SCHEDULED') && (
                  <div className="flex flex-col gap-1.5 text-sm font-semibold">
                    <label htmlFor="scheduledFor">{t('order.scheduleFor')}</label>
                    <input
                      id="scheduledFor"
                      name="scheduledFor"
                      type="date"
                      className="min-h-11 rounded-control border border-line bg-surface px-3 font-normal"
                    />
                  </div>
                )}
                {nextStatuses(o.status).includes('PARTIAL_DELIVERED') && (
                  <fieldset className="flex flex-col gap-2 text-sm">
                    <legend className="mb-1 font-semibold">{t('order.deliveredCounts')}</legend>
                    {o.items.map((i) => (
                      <label key={i.id} className="flex items-center justify-between gap-3">
                        {lineName(i)}
                        <input
                          type="number"
                          name={`delivered.${i.id}`}
                          min={0}
                          max={i.quantity}
                          defaultValue={i.quantity}
                          className="min-h-11 w-20 rounded-control border border-line bg-surface px-2"
                        />
                      </label>
                    ))}
                  </fieldset>
                )}
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
          {/* C14: returns and exchanges recorded so far, and a form while the order is delivered. */}
          <Card className="flex flex-col gap-3 has-[ul:empty]:not-has-[form]:hidden">
            <h2 className="font-semibold">{t('return.title')}</h2>
            <ul className="flex flex-col gap-2 text-sm" data-testid="order-returns">
              {returns.map((r) => (
                <li key={r.id} className="rounded-control border border-line p-3">
                  <p className="font-semibold">
                    {t(`return.kind_${r.kind}`)} · {t(`return.reason_${r.reason}`)}
                  </p>
                  <p>
                    {r.items.map((i) => `${itemName.get(i.itemId)} × ${i.quantity}`).join(', ')}
                  </p>
                  <p className="text-muted">
                    {[
                      r.refund > 0 &&
                        `${t('return.refunded')} ${money(r.refund)} ${r.refundMethod}`,
                      r.restocked && t('return.restocked'),
                      r.note,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  {r.exchangeOrderId && (
                    <Link href={`/admin/orders/${r.exchangeOrderId}`} className="underline">
                      {t('return.exchangeFor', { no: r.exchangeOrderNo! })}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            {(o.status === 'DELIVERED' || o.status === 'PARTIAL_DELIVERED') && (
              <ActionForm action={recordReturn} className="flex flex-col gap-3 text-sm">
                <input type="hidden" name="id" value={o.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5 font-semibold">
                    <label htmlFor="kind">{t('return.kind')}</label>
                    <select id="kind" name="kind" className={field}>
                      {(['return', 'exchange'] as const).map((k) => (
                        <option key={k} value={k}>
                          {t(`return.kind_${k}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5 font-semibold">
                    <label htmlFor="reason">{t('return.reason')}</label>
                    <select id="reason" name="reason" className={field}>
                      {returnReasons.map((k) => (
                        <option key={k} value={k}>
                          {t(`return.reason_${k}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1 font-semibold">{t('return.items')}</legend>
                  {o.items.map((i) => (
                    <label key={i.id} className="flex items-center justify-between gap-3">
                      {lineName(i)}
                      <input
                        type="number"
                        name={`ret.${i.id}`}
                        min={0}
                        max={i.quantity}
                        defaultValue={0}
                        className={`${field} w-20`}
                      />
                    </label>
                  ))}
                </fieldset>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(
                    [
                      ['refund', 'number'],
                      ['refundMethod', 'text'],
                      ['exchangeOrderNo', 'text'],
                    ] as const
                  ).map(([k, type]) => (
                    <div key={k} className="flex flex-col gap-1.5 font-semibold">
                      <label htmlFor={k}>{t(`return.${k}`)}</label>
                      <input id={k} name={k} type={type} min={0} className={field} />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-1.5 font-semibold">
                  <label htmlFor="return-note">{t('return.note')}</label>
                  <input id="return-note" name="note" maxLength={500} className={field} />
                </div>
                <label className="flex min-h-11 items-center gap-3 font-semibold">
                  <input type="checkbox" name="restock" className="size-5" />
                  {t('return.restock')}
                </label>
                <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
                  {t('return.save')}
                </button>
              </ActionForm>
            )}
          </Card>
          {/* C13: cancelled orders can be tidied away to the Trash, and brought back. */}
          {o.status === 'CANCELLED' && (
            <Card>
              <ActionForm action={o.deletedAt ? restoreOrder : trashOrder}>
                <input type="hidden" name="id" value={o.id} />
                <button className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold">
                  {t(o.deletedAt ? 'order.restore' : 'order.trash')}
                </button>
              </ActionForm>
            </Card>
          )}
          <Card>
            <h2 className="mb-3 font-semibold">{t('order.items')}</h2>
            <ul className="divide-y divide-line">
              {o.items.map((i) => (
                <li key={lineName(i)} className="flex items-center justify-between gap-3 py-2">
                  <span>
                    {lineName(i)}
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
              {o.discount > 0 && (
                <>
                  <dt className="text-muted">
                    {[t('order.discount'), o.couponCode].filter(Boolean).join(' · ')}
                  </dt>
                  <dd className="text-right" data-testid="order-discount">
                    −{money(o.discount)}
                  </dd>
                </>
              )}
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
            {/* C6 extras; only the ones the shopper filled in. */}
            <dl
              className="grid grid-cols-[auto_1fr] gap-x-3 text-sm empty:hidden"
              data-testid="order-extras"
            >
              {(
                [
                  ['altPhone', o.shipAltPhone],
                  [
                    'preferredTime',
                    o.preferredTime === 'any' ? '' : t(`checkout.time_${o.preferredTime}`),
                  ],
                  ['giftWrap', o.giftWrap ? t('common.yes') : ''],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-muted">{t(`order.${k}`)}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
            </dl>
            {o.shipLocation && (
              <a
                href={`https://www.google.com/maps?q=${o.shipLocation.lat},${o.shipLocation.lng}`}
                className="text-sm font-semibold underline"
                data-testid="order-location"
              >
                {t('order.location', { m: o.shipLocation.accuracy })}
              </a>
            )}
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
