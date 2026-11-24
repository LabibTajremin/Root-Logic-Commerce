import type { Metadata } from 'next'
import Link from 'next/link'
import {
  lineName,
  orderSources,
  orderStatuses,
  type OrderSource,
  type OrderStatus,
} from '@/modules/orders'
import { currentSettings } from '@/server/request'
import { Icon } from '@/ui/icon'
import { ActionForm } from '@/ui/action-form'
import { Badge, Card } from '@/ui/primitives'
import { bulkOrders } from './actions'
import { adminContext } from '../context'
import { TONE } from './tone'

export const metadata: Metadata = { title: 'Orders' }

type Search = Promise<{ status?: string; q?: string; source?: string; trash?: string }>

export default async function OrdersPage({ searchParams }: { searchParams: Search }) {
  const { status, q, source, trash } = await searchParams
  const { orders, store, t, money } = await adminContext('orders.manage')
  const { business } = await currentSettings()
  const active = orderStatuses.find((s) => s === status) as OrderStatus | undefined
  const from = orderSources.find((s) => s === source) as OrderSource | undefined
  const { rows, total } = await orders.listOrders(store.id, {
    status: active,
    source: from,
    trash: trash === '1',
    duplicateHours: business.fraud.duplicateHours,
    search: q || undefined,
  })
  const tabs: { key?: OrderStatus; label: string }[] = [
    { label: t('orders.all') },
    ...orderStatuses.map((s) => ({ key: s, label: t(`status.${s}`) })),
  ]
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl">{t('orders.title')}</h1>
        <Link
          href="/admin/orders/new"
          className="ml-auto inline-flex min-h-11 items-center rounded-control bg-button px-4 text-sm font-semibold text-button-text"
        >
          {t('manual.title')}
        </Link>
      </div>
      <nav
        aria-label={t('orders.title')}
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-line px-4"
      >
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            href={tab.key ? `/admin/orders?status=${tab.key}` : '/admin/orders'}
            aria-current={tab.key === active ? 'page' : undefined}
            className="min-h-11 shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-muted aria-[current=page]:border-accent aria-[current=page]:text-text"
          >
            {tab.label}
          </Link>
        ))}
        <Link
          href="/admin/orders/incomplete"
          className="min-h-11 shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-muted"
        >
          {t('drafts.title')}
        </Link>
        <Link
          href="/admin/orders?trash=1"
          aria-current={trash === '1' ? 'page' : undefined}
          className="min-h-11 shrink-0 border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-muted aria-[current=page]:border-accent aria-[current=page]:text-text"
        >
          {t('orders.trash')}
        </Link>
      </nav>
      <form className="flex gap-2" role="search">
        {active && <input type="hidden" name="status" value={active} />}
        <label className="sr-only" htmlFor="q">
          {t('orders.search')}
        </label>
        <label className="sr-only" htmlFor="source">
          {t('orders.source')}
        </label>
        <select
          id="source"
          name="source"
          defaultValue={from ?? ''}
          className="min-h-11 rounded-control border border-line bg-surface px-2"
        >
          <option value="">{t('orders.anySource')}</option>
          {orderSources.map((s) => (
            <option key={s} value={s}>
              {t(`source.${s}`)}
            </option>
          ))}
        </select>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder={t('orders.search')}
          className="min-h-11 flex-1 rounded-control border border-line bg-surface px-3"
        />
        <button className="inline-flex min-h-11 items-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-semibold">
          <Icon name="search" size={18} />
          {t('common.search')}
        </button>
      </form>
      <p className="text-sm text-muted" data-testid="orders-total">
        {total}
      </p>
      {rows.length === 0 ? (
        <Card>
          <p className="text-muted">{t('orders.empty')}</p>
        </Card>
      ) : (
        <>
          {/* C16: tick orders, then print their invoices or packing slips together. */}
          {/* F4: tick orders below, then act on all of them. */}
          <ActionForm
            id="bulk"
            action={bulkOrders}
            className="flex flex-wrap items-center justify-end gap-2"
          >
            <button
              name="intent"
              value="print"
              className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold"
            >
              {t('orders.printSelected')}
            </button>
            <label className="sr-only" htmlFor="bulk-to">
              {t('orders.bulkStatus')}
            </label>
            <select
              id="bulk-to"
              name="to"
              className="min-h-11 rounded-control border border-line bg-surface px-2 text-sm"
            >
              {orderStatuses.map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
            <button
              name="intent"
              value="status"
              className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold"
            >
              {t('orders.bulkApply')}
            </button>
            <button
              name="intent"
              value="trash"
              className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold text-danger"
            >
              {t('order.trash')}
            </button>
          </ActionForm>
          <ul className="flex flex-col gap-3">
            {rows.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2">
                <input
                  type="checkbox"
                  name="ids"
                  value={o.id}
                  form="bulk"
                  aria-label={t('orders.select', { no: o.orderNo })}
                  className="size-6 shrink-0"
                />
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="flex min-h-14 flex-1 flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-line bg-surface p-4"
                >
                  <span className="font-semibold">#{o.orderNo}</span>
                  <Badge tone={TONE[o.status]}>{t(`status.${o.status}`)}</Badge>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">
                    {o.shipName} · {o.shipPhone}
                  </span>
                  <span className="text-xs text-muted" data-testid="order-source">
                    {t(`source.${o.source}`)}
                  </span>
                  <span className="font-semibold">{money(o.total)}</span>
                  {o.duplicateOf && (
                    <span
                      className="basis-full text-xs font-semibold text-danger"
                      data-testid="order-duplicate"
                    >
                      {t('orders.duplicateOf', {
                        no: o.duplicateOf.orderNo,
                        status: t(`status.${o.duplicateOf.status}`),
                        hours: Math.max(
                          1,
                          Math.round(
                            (o.createdAt.getTime() - o.duplicateOf.createdAt.getTime()) / 3_600_000,
                          ),
                        ),
                      })}
                    </span>
                  )}
                </Link>
                {/* F12: the rest of the row — when, where, what, and quick contact. */}
                <div className="flex basis-full flex-wrap items-center gap-x-3 gap-y-1 ps-8 text-xs text-muted">
                  <span>{o.createdAt.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}</span>
                  <span>
                    {o.shipAddress}, {o.shipArea}, {o.shipDistrict}
                  </span>
                  <span data-testid="order-lines">
                    {o.lines
                      .map((l) =>
                        [`${lineName(l)} × ${l.quantity}`, l.sku].filter(Boolean).join(' · '),
                      )
                      .join(', ')}
                  </span>
                  <span>
                    {t('order.delivery')} {money(o.deliveryCharge)}
                  </span>
                  <Badge tone="neutral">{t(`payment.${o.paymentStatus}`)}</Badge>
                  <span className="italic empty:hidden">{o.note}</span>
                  <a href={`tel:${o.shipPhone}`} className="underline">
                    {t('order.call')}
                  </a>
                  <a href={`https://wa.me/88${o.shipPhone}`} className="underline">
                    {t('order.whatsapp')}
                  </a>
                  <a href={`/admin/orders/print?ids=${o.id}`} className="underline">
                    {t('print.doc_invoice')}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
