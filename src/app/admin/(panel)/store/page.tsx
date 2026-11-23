import type { Metadata } from 'next'
import { helpText } from '@/help'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, Field } from '@/ui/primitives'
import { adminContext } from '../context'
import { bandsToText } from '@/modules/site-settings'
import { saveBusiness } from '../settings-actions'

export const metadata: Metadata = { title: 'Shop info' }

const FIELDS = ['phone', 'whatsapp', 'messenger', 'address', 'mapUrl'] as const

/** Contact details shoppers see (help bubble, contact page, invoices). */
export default async function StorePage() {
  const { allowed, locale, t } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const { business, version } = await currentSettings()
  return (
    <>
      <h1 className="font-heading text-3xl">{t('store.title')}</h1>
      <p className="text-sm text-muted">{t('store.intro')}</p>
      <Card>
        <ActionForm action={saveBusiness} className="flex flex-col gap-4" saved={t('common.saved')}>
          <input type="hidden" name="version" value={version} />
          {FIELDS.map((f) => (
            <Field
              key={f}
              id={`contact.${f}`}
              name={`contact.${f}`}
              defaultValue={business.contact[f]}
              label={t(`store.${f}`)}
              help={helpText(locale, `store.${f}`)}
              helpLabel={t('common.help')}
            />
          ))}
          <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
            {t('stock.showLeft')}
            <input
              type="checkbox"
              name="showStockLeft"
              defaultChecked={business.showStockLeft}
              className="size-6 accent-[var(--color-accent)]"
            />
          </label>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">{t('store.checkoutFields')}</legend>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="checkout.email" className="text-sm font-semibold">
                {t('store.emailField')}
              </label>
              <select
                id="checkout.email"
                name="checkout.email"
                defaultValue={business.checkout.email}
                className="min-h-11 rounded-control border border-line bg-surface px-3"
              >
                {(['off', 'optional', 'required'] as const).map((v) => (
                  <option key={v} value={v}>
                    {t(`store.email_${v}`)}
                  </option>
                ))}
              </select>
            </div>
            {(['altPhone', 'preferredTime', 'giftWrap'] as const).map((k) => (
              <label
                key={k}
                className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold"
              >
                {t(`store.ask${k[0]!.toUpperCase()}${k.slice(1)}`)}
                <input
                  type="checkbox"
                  name={`checkout.${k}`}
                  defaultChecked={business.checkout[k]}
                  className="size-6 accent-[var(--color-accent)]"
                />
              </label>
            ))}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">{t('trust.title')}</legend>
            <p className="text-sm text-muted">{t('trust.hint')}</p>
            {(['tradeLicence', 'tin', 'bin', 'dbid', 'warranty'] as const).map((k) => (
              <Field
                key={k}
                id={`trust.${k}`}
                name={`trust.${k}`}
                defaultValue={business.trust[k]}
                maxLength={k === 'warranty' ? 200 : 60}
                label={t(`trust.${k}`)}
                help={helpText(locale, `trust.${k}`)}
                helpLabel={t('common.help')}
              />
            ))}
          </fieldset>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="budgetBands" className="font-semibold">
              {t('home.budget')}
            </label>
            <p id="budgetBands-hint" className="text-sm text-muted">
              {t('store.budgetHint')}
            </p>
            <textarea
              id="budgetBands"
              name="budgetBands"
              rows={3}
              aria-describedby="budgetBands-hint"
              defaultValue={bandsToText(business.budgetBands)}
              className="rounded-control border border-line bg-surface p-3"
            />
          </div>
          <Button type="submit" icon="check" className="self-start">
            {t('common.save')}
          </Button>
        </ActionForm>
      </Card>
    </>
  )
}
