import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isUuid } from '@/modules/shared'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { PrintButton } from '@/ui/print-button'
import { adminContext } from '../../../context'
import { scanParcel } from '../../actions'
import { CameraScan } from './camera-scan'

export const metadata: Metadata = { title: 'Parcel scan' }

/** E4: scan boxes into the session; prints as the hand-over receipt the rider signs. */
export default async function ScanSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const { courier, store, t, money } = await adminContext('orders.manage')
  const s = await courier.session(store.id, id)
  if (!s) notFound()
  const cod = s.items.reduce((a, i) => a + i.cod, 0)
  return (
    <>
      <Card className="flex flex-col gap-1 text-sm">
        <h2 className="font-heading text-2xl">
          {t(`scan.kind_${s.kind}`)} · {t(`courier.${s.provider}`)}
        </h2>
        <p className="text-muted">
          {s.createdAt.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
          {s.riderName && ` · ${t('scan.riderName')}: ${s.riderName} ${s.riderPhone}`}
        </p>
      </Card>
      <Card className="flex flex-col gap-3 print:hidden">
        <ActionForm
          action={scanParcel}
          className="flex flex-wrap items-end gap-2"
          saved={t('scan.added')}
        >
          <input type="hidden" name="session" value={s.id} />
          <div className="flex flex-1 flex-col gap-1.5 text-sm font-semibold">
            <label htmlFor="scan-code">{t('scan.code')}</label>
            <input
              id="scan-code"
              name="code"
              required
              autoFocus
              autoComplete="off"
              className="min-h-11 rounded-control border border-line bg-surface px-3 font-normal"
            />
          </div>
          <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
            {t('scan.add')}
          </button>
        </ActionForm>
        <CameraScan input="scan-code" start={t('scan.camera')} stop={t('scan.cameraStop')} />
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">
          {t('scan.parcels', { n: s.items.length })} · {t('courier.cod')} {money(cod)}
        </h2>
        <table className="w-full text-sm" data-testid="scan-items">
          <tbody>
            {s.items.map((i) => (
              <tr key={i.orderId} className="border-t border-line">
                <td className="py-2 font-semibold">#{i.orderNo}</td>
                <td className="py-2">{i.shipName}</td>
                <td className="py-2">{i.tracking}</td>
                <td className="py-2 text-end">{money(i.cod)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.kind === 'return' && (
          <div data-testid="scan-outstanding">
            <h3 className="font-semibold">{t('scan.stillOut', { n: s.outstanding.length })}</h3>
            <ul className="text-sm text-muted">
              {s.outstanding.map((o) => (
                <li key={o.orderId}>
                  #{o.orderNo} · {o.shipName} · {o.tracking}
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* The receipt the rider and the shop sign on paper. */}
        <div className="mt-6 hidden grid-cols-2 gap-8 text-sm print:grid">
          <p className="border-t border-text pt-1">{t('scan.signShop')}</p>
          <p className="border-t border-text pt-1">{t('scan.signRider')}</p>
        </div>
        <PrintButton label={t('scan.print')} />
      </Card>
    </>
  )
}
