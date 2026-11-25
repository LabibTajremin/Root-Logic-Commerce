import type { Metadata } from 'next'
import Link from 'next/link'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { lineName } from '@/modules/orders'
import { textOr } from '@/modules/site-settings'
import { PLACED_COOKIE, readPreview } from '@/server/preview'
import { runtime } from '@/server/runtime'
import { PrintButton } from '@/ui/print-button'
import { GaEvent } from '../../ga'
import { storefront } from '../../storefront'
import { TrustStrip } from '../../trust-strip'

export const metadata: Metadata = { robots: { index: false } }

const button =
  'inline-flex min-h-11 items-center rounded-control border border-line px-6 font-semibold'

/**
 * C10 thank-you page. Anyone sees the number; the order itself only shows in the browser
 * that placed it (signed cookie with number + phone), otherwise the Track page needs the phone.
 */
export default async function OrderPlaced({ params }: { params: Promise<{ no: string }> }) {
  const { no } = await params
  if (!/^\d{1,9}$/.test(no)) notFound()
  const [{ t, business, orders, store, money }, { config }, jar] = await Promise.all([
    storefront(),
    runtime(),
    cookies(),
  ])
  const ty = business.thankYou
  const [placedNo, phone] = (
    readPreview(config.authSecret, store.id, jar.get(PLACED_COOKIE)?.value) ?? ''
  ).split(':')
  const order = placedNo === no ? await orders.trackOrder(store.id, Number(no), phone!) : null
  const wa = business.contact.whatsapp.replace(/\D/g, '')
  return (
    <section
      className="mx-auto flex max-w-xl flex-col items-center gap-4 border-t-4 px-4 py-16 text-center"
      style={{ borderColor: textOr(ty.accent, 'var(--color-accent)') }}
    >
      <GaEvent name="purchase" params={{ transaction_id: no, currency: 'BDT' }} />
      <h1 className="font-heading text-3xl">{textOr(ty.heading, t('success.title'))}</h1>
      <p className="text-muted">{textOr(ty.sub, t('success.body'))}</p>
      <p className="whitespace-pre-line empty:hidden" data-testid="thanks-message">
        {ty.message}
      </p>
      <p className="flex flex-col gap-1 rounded-card border border-line bg-surface px-8 py-4">
        <span className="text-sm text-muted">{t('success.orderNo')}</span>
        <span data-testid="order-no" className="font-heading text-3xl">
          #{no}
        </span>
      </p>
      {order && (
        <div
          className="flex w-full flex-col gap-2 rounded-card border border-line bg-surface p-5 text-start text-sm"
          data-testid="placed-order"
        >
          <ul className="flex flex-col gap-1">
            {order.items.map((i) => (
              <li key={lineName(i)} className="flex justify-between gap-3">
                <span>
                  {lineName(i)} × {i.quantity}
                </span>
                <span>{money(i.unitPrice * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-line pt-2 font-semibold">
            <span>{t('success.total')}</span>
            <span>{money(order.total)}</span>
          </p>
          <p className="text-muted">
            {order.shipName} · {order.shipAddress}, {order.shipArea}, {order.shipDistrict}
          </p>
          <div hidden={!ty.invoice} className="print:hidden">
            <PrintButton label={t('success.print')} />
          </div>
        </div>
      )}
      <div className="flex flex-wrap justify-center gap-2 print:hidden">
        <Link
          href={`/track?no=${no}`}
          className="inline-flex min-h-11 items-center rounded-control bg-button px-6 font-semibold text-button-text"
        >
          {t('success.track')}
        </Link>
        <Link href="/" hidden={!ty.home} className={button}>
          {t('success.home')}
        </Link>
        <a
          href={`https://wa.me/${wa}?text=${encodeURIComponent(t('success.waText', { no }))}`}
          hidden={!(ty.whatsapp && wa)}
          className={button}
        >
          {t('success.whatsapp')}
        </a>
      </div>
      <TrustStrip trust={business.trust} t={t} place="thanks" />
    </section>
  )
}
