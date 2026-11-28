import type { Metadata } from 'next'
import Link from 'next/link'
import { courierProviders, sessionKinds } from '@/modules/courier'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { startScanSession } from '../actions'

export const metadata: Metadata = { title: 'Parcel scan' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'

/** E4: start a hand-over (parcels leave with a rider) or a returns session; recent sessions. */
export default async function ScanSessionsPage() {
  const { courier, store, t } = await adminContext('orders.manage')
  const sessions = await courier.listSessions(store.id)
  return (
    <>
      <Card>
        <ActionForm action={startScanSession} className="flex flex-col gap-3">
          <h2 className="font-semibold">{t('scan.start')}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 text-sm font-semibold">
              <label htmlFor="scan-kind">{t('scan.kind')}</label>
              <select id="scan-kind" name="kind" className={field}>
                {sessionKinds.map((k) => (
                  <option key={k} value={k}>
                    {t(`scan.kind_${k}`)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5 text-sm font-semibold">
              <label htmlFor="scan-provider">{t('courier.courier')}</label>
              <select id="scan-provider" name="provider" className={field}>
                {courierProviders.map((p) => (
                  <option key={p} value={p}>
                    {t(`courier.${p}`)}
                  </option>
                ))}
              </select>
            </div>
            {(['riderName', 'riderPhone'] as const).map((k) => (
              <div key={k} className="flex flex-col gap-1.5 text-sm font-semibold">
                <label htmlFor={`scan-${k}`}>{t(`scan.${k}`)}</label>
                <input
                  id={`scan-${k}`}
                  name={k}
                  maxLength={k === 'riderName' ? 80 : 20}
                  className={field}
                />
              </div>
            ))}
          </div>
          <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
            {t('scan.open')}
          </button>
        </ActionForm>
      </Card>
      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('scan.recent')}</h2>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted">{t('scan.none')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line text-sm" data-testid="scan-sessions">
            {sessions.map((s) => (
              <li key={s.id} className="py-2">
                <Link href={`/admin/couriers/scan/${s.id}`} className="font-semibold underline">
                  {t(`scan.kind_${s.kind}`)} · {t(`courier.${s.provider}`)} ·{' '}
                  {s.createdAt.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                </Link>{' '}
                <span className="text-muted">{t('scan.count', { n: s.parcels })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
