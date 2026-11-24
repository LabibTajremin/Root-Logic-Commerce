import type { Metadata } from 'next'
import { blockKinds } from '@/modules/fraud'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { saveBusiness } from '../settings-actions'
import { addBlock, removeBlock } from './actions'

export const metadata: Metadata = { title: 'Order guard' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
const when = (d: Date) => d.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })

/** D1/D3/D4/D5: order limits, the blocklist, refused attempts and risky numbers. */
export default async function FraudPage() {
  const { fraud, store, t } = await adminContext('orders.manage')
  const { business, version } = await currentSettings()
  const [blocks, report] = await Promise.all([fraud.listBlocks(store.id), fraud.report(store.id)])
  const rules = business.fraud
  return (
    <>
      <h1 className="font-heading text-3xl">{t('fraud.title')}</h1>
      <Card>
        <ActionForm action={saveBusiness} className="flex flex-col gap-3" saved={t('common.saved')}>
          <h2 className="font-semibold">{t('fraud.rules')}</h2>
          <input type="hidden" name="version" value={version} />
          <div className="grid gap-3 sm:grid-cols-3">
            {(['perWindow', 'windowHours', 'duplicateHours'] as const).map((k) => (
              <div key={k} className="flex flex-col gap-1.5 text-sm font-semibold">
                <label htmlFor={`fraud.${k}`}>{t(`fraud.${k}`)}</label>
                <input
                  id={`fraud.${k}`}
                  name={`fraud.${k}`}
                  type="number"
                  min={k === 'perWindow' ? 0 : 1}
                  defaultValue={rules[k]}
                  className={field}
                />
              </div>
            ))}
          </div>
          <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              name="fraud.blockDuplicates"
              defaultChecked={rules.blockDuplicates}
              className="size-5"
            />
            {t('fraud.blockDuplicates')}
          </label>
          <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
            {t('common.save')}
          </button>
        </ActionForm>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('fraud.blocklist')}</h2>
        <ActionForm action={addBlock} className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5 text-sm font-semibold">
            <label htmlFor="block-kind">{t('fraud.kind')}</label>
            <select id="block-kind" name="kind" className={field}>
              {blockKinds.map((k) => (
                <option key={k} value={k}>
                  {t(`fraud.kind_${k}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1.5 text-sm font-semibold">
            <label htmlFor="block-value">{t('fraud.value')}</label>
            <input id="block-value" name="value" required className={field} />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 text-sm font-semibold">
            <label htmlFor="block-note">{t('fraud.note')}</label>
            <input id="block-note" name="note" className={field} />
          </div>
          <button className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold">
            {t('fraud.block')}
          </button>
        </ActionForm>
        <ul className="peer flex flex-col divide-y divide-line text-sm" data-testid="blocklist">
          {blocks.map((b) => (
            <li key={b.id} className="flex items-center justify-between gap-3 py-2">
              <span>
                <span className="font-semibold">{t(`fraud.kind_${b.kind}`)}</span> {b.value}{' '}
                <span className="text-muted">{b.note}</span>
              </span>
              <ActionForm action={removeBlock}>
                <input type="hidden" name="id" value={b.id} />
                <button className="min-h-11 px-2 text-sm underline">
                  {t('fraud.unblock')} {b.value}
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
        <p className="hidden text-sm text-muted peer-empty:block">{t('fraud.noBlocks')}</p>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('fraud.attempts')}</h2>
        <ul className="peer flex flex-col gap-1 text-sm" data-testid="attempts">
          {report.attempts.map((a) => (
            <li key={`${a.createdAt.toISOString()}${a.phone}${a.reason}`}>
              {when(a.createdAt)} · {t(`fraud.reason_${a.reason}`)} · {a.phone} · {a.ip}
            </li>
          ))}
        </ul>
        <p className="hidden text-sm text-muted peer-empty:block">{t('fraud.noAttempts')}</p>
      </Card>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('fraud.risky')}</h2>
        <ul className="peer flex flex-col gap-1 text-sm" data-testid="risky">
          {report.risky.map((r) => (
            <li key={r.phone}>
              {t('fraud.riskyRow', { phone: r.phone, lost: r.lost, total: r.total })}
            </li>
          ))}
        </ul>
        <p className="hidden text-sm text-muted peer-empty:block">{t('fraud.noRisky')}</p>
      </Card>
    </>
  )
}
