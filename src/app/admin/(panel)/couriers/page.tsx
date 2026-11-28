import type { Metadata } from 'next'
import { courierProviders, credentialFields } from '@/modules/courier'
import { ActionForm } from '@/ui/action-form'
import { Badge, Card } from '@/ui/primitives'
import { origin } from '../../../(storefront)/origin'
import { adminContext } from '../context'
import { addCourierAccount, makeDefaultCourier, removeCourierAccount } from './actions'

export const metadata: Metadata = { title: 'Couriers' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'

/** E1: the shop's courier accounts (keys sealed), the default one, and each webhook URL. */
export default async function CouriersPage() {
  const { courier, store, t } = await adminContext('settings.manage')
  const [accounts, base] = await Promise.all([courier.listAccounts(store.id), origin()])
  return (
    <>
      <p className="text-sm text-muted">{t('courier.intro')}</p>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('courier.accounts')}</h2>
        <ul className="flex flex-col divide-y divide-line" data-testid="courier-accounts">
          {accounts.map((a) => (
            <li key={a.id} className="flex flex-col gap-2 py-3">
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{a.label}</span>
                <span className="text-sm text-muted">{t(`courier.${a.provider}`)}</span>
                {a.isDefault && <Badge tone="success">{t('courier.default')}</Badge>}
              </p>
              <label className="flex flex-col gap-1 text-xs text-muted">
                {t('courier.webhook')}
                <input
                  readOnly
                  value={`${base}/api/courier/hook/${a.webhookToken}`}
                  className={`${field} text-sm`}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {!a.isDefault && (
                  <ActionForm action={makeDefaultCourier}>
                    <input type="hidden" name="id" value={a.id} />
                    <button className="min-h-11 rounded-control border border-line px-3 text-sm font-semibold">
                      {t('courier.makeDefault')} {a.label}
                    </button>
                  </ActionForm>
                )}
                <ActionForm action={removeCourierAccount}>
                  <input type="hidden" name="id" value={a.id} />
                  <button className="min-h-11 px-2 text-sm text-danger underline">
                    {t('common.remove')} {a.label}
                  </button>
                </ActionForm>
              </div>
            </li>
          ))}
        </ul>
        {accounts.length === 0 && <p className="text-sm text-muted">{t('courier.none')}</p>}
      </Card>
      {courierProviders.map((p) => (
        <Card key={p}>
          <ActionForm action={addCourierAccount} className="flex flex-col gap-3">
            <h2 className="font-semibold">{t('courier.add', { name: t(`courier.${p}`) })}</h2>
            <input type="hidden" name="provider" value={p} />
            <div className="grid gap-3 sm:grid-cols-2">
              {['label', ...credentialFields[p]].map((f) => (
                <div key={f} className="flex flex-col gap-1.5 text-sm font-semibold">
                  <label htmlFor={`${p}-${f}`}>{t(`courier.field.${f}`)}</label>
                  <input
                    id={`${p}-${f}`}
                    name={f}
                    required
                    autoComplete="off"
                    type={/secret|password|token/i.test(f) ? 'password' : 'text'}
                    className={field}
                  />
                </div>
              ))}
            </div>
            <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
              {t('courier.save')}
            </button>
          </ActionForm>
        </Card>
      ))}
    </>
  )
}
