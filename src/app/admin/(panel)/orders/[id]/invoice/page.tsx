import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { formatMoney, isUuid } from '@/modules/shared'
import { adminContext } from '../../../context'
import { PrintButton } from './print-button'
import { currentSettings } from '@/server/request'

export const metadata: Metadata = { title: 'Invoice' }

export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const { orders, store, t } = await adminContext('orders.manage')
  const o = await orders.getOrder(store.id, id)
  if (!o) notFound()
  const { design } = await currentSettings()
  return (
    <article className="mx-auto flex w-full max-w-2xl flex-col gap-6 rounded-card bg-surface p-8 print:p-0">
      <header className="flex items-start justify-between">
        <div>
          <p className="font-heading text-2xl">{design.brand.name}</p>
          <p className="text-sm text-muted">
            {t('invoice.title')} #{o.orderNo}
          </p>
        </div>
        <PrintButton label={t('order.invoice')} />
      </header>
      <section>
        <h2 className="text-xs font-semibold uppercase text-muted">{t('invoice.billTo')}</h2>
        <p>{o.shipName}</p>
        <p>{o.shipPhone}</p>
        <p>
          {o.shipAddress}, {o.shipArea}, {o.shipDistrict}
        </p>
      </section>
      <table className="w-full text-sm">
        <tbody>
          {o.items.map((i) => (
            <tr key={i.name} className="border-b border-line">
              <td className="py-2">{i.name}</td>
              <td className="py-2 text-right">× {i.quantity}</td>
              <td className="py-2 text-right">{formatMoney(i.unitPrice * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="pt-2 text-right text-muted">
              {t('order.delivery')}
            </td>
            <td className="pt-2 text-right">{formatMoney(o.deliveryCharge)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="pt-1 text-right font-semibold">
              {t('order.total')} ({t('order.cod')})
            </td>
            <td className="pt-1 text-right text-lg font-semibold">{formatMoney(o.total)}</td>
          </tr>
        </tfoot>
      </table>
    </article>
  )
}
