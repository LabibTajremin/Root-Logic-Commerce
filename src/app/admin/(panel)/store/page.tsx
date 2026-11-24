import type { Metadata } from 'next'
import { helpText } from '@/help'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, Field } from '@/ui/primitives'
import { adminContext } from '../context'
import { bdDistricts } from '@/modules/orders'
import { bandsToText } from '@/modules/site-settings'
import { saveBusiness } from '../settings-actions'

export const metadata: Metadata = { title: 'Shop info' }

const FIELDS = ['phone', 'whatsapp', 'messenger', 'address', 'mapUrl'] as const

/** Contact details shoppers see (help bubble, contact page, invoices). */
export default async function StorePage() {
  const { allowed, locale, t, catalog, store } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const { business, version } = await currentSettings()
  const products = await catalog.listProducts(store.id)
  const taka = (m: number | null) => (m === null ? '' : m / 100)
  const num = (id: string, label: string, value: number | '') => (
    <div className="flex flex-col gap-1.5 text-sm font-semibold">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={id}
        type="number"
        min={1}
        defaultValue={value}
        className="min-h-11 rounded-control border border-line bg-surface px-3 font-normal"
      />
    </div>
  )
  const zoneSelect = (id: string, label: string, value: string, none: string) => (
    <div key={id} className="flex flex-col gap-1.5 text-sm font-semibold">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        name={id}
        defaultValue={value}
        className="min-h-11 rounded-control border border-line bg-surface px-3 font-normal"
      >
        <option value="">{none}</option>
        {business.deliveryZones.map((z) => (
          <option key={z.id} value={z.id}>
            {z.label}
          </option>
        ))}
      </select>
    </div>
  )
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
            <legend className="mb-1 font-semibold">{t('store.freeShipping')}</legend>
            {num('free.min', t('store.freeMin'), taka(business.freeShipping.minSubtotal))}
            <p className="text-sm font-semibold">{t('store.freeZones')}</p>
            {business.deliveryZones.map((z) => (
              <label key={z.id} className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  name="free.zones"
                  value={z.id}
                  defaultChecked={business.freeShipping.zoneIds.includes(z.id)}
                  className="size-5"
                />
                {z.label}
              </label>
            ))}
            <div className="flex flex-col gap-1.5 text-sm font-semibold">
              <label htmlFor="free.products">{t('store.freeProducts')}</label>
              <select
                id="free.products"
                name="free.products"
                multiple
                defaultValue={business.freeShipping.productIds}
                className="min-h-24 rounded-control border border-line bg-surface p-2 font-normal"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>
          <fieldset className="grid grid-cols-2 gap-3">
            <legend className="mb-1 font-semibold">{t('store.limits')}</legend>
            {num('limits.min', t('store.minOrder'), taka(business.orderLimits.minOrder))}
            {num('limits.max', t('store.maxOrder'), taka(business.orderLimits.maxOrder))}
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">{t('store.addressTitle')}</legend>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="address.mode" className="text-sm font-semibold">
                {t('store.addressMode')}
              </label>
              <select
                id="address.mode"
                name="address.mode"
                defaultValue={business.address.mode}
                className="min-h-11 rounded-control border border-line bg-surface px-3"
              >
                {(['text', 'picker'] as const).map((v) => (
                  <option key={v} value={v}>
                    {t(`store.address_${v}`)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm text-muted">{t('store.zoneHint')}</p>
            {zoneSelect(
              'zone.other',
              t('store.otherZone'),
              business.address.otherZone,
              t('store.noGuess'),
            )}
            <details className="rounded-control border border-line p-3">
              <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold">
                {t('store.zoneByDistrict')}
              </summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {bdDistricts.map((d) =>
                  zoneSelect(
                    `zone.${d.en}`,
                    `${d.en} · ${d.bn}`,
                    business.address.districtZones[d.en] ?? '',
                    t('store.anyOther'),
                  ),
                )}
              </div>
            </details>
          </fieldset>
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-semibold">{t('store.thanksTitle')}</legend>
            <p className="text-sm text-muted">{t('store.thanksHint')}</p>
            {(['heading', 'sub'] as const).map((k) => (
              <Field
                key={k}
                id={`ty.${k}`}
                name={`ty.${k}`}
                defaultValue={business.thankYou[k]}
                label={t(`store.thanks_${k}`)}
                help={helpText(locale, `store.thanks_${k}`)}
                helpLabel={t('common.help')}
              />
            ))}
            <div className="flex flex-col gap-1.5 text-sm font-semibold">
              <label htmlFor="ty.message">{t('store.thanks_message')}</label>
              <textarea
                id="ty.message"
                name="ty.message"
                rows={3}
                maxLength={1000}
                defaultValue={business.thankYou.message}
                className="rounded-control border border-line bg-surface p-3 font-normal"
              />
            </div>
            <Field
              id="ty.accent"
              name="ty.accent"
              defaultValue={business.thankYou.accent}
              label={t('store.thanks_accent')}
              help={helpText(locale, 'store.thanks_accent')}
              helpLabel={t('common.help')}
              placeholder="#1f7a4d"
              pattern="#[0-9a-fA-F]{6}"
            />
            {(['home', 'invoice', 'whatsapp'] as const).map((k) => (
              <label
                key={k}
                className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold"
              >
                {t(`store.thanks_${k}`)}
                <input
                  type="checkbox"
                  name={`ty.${k}`}
                  defaultChecked={business.thankYou[k]}
                  className="size-6 accent-[var(--color-accent)]"
                />
              </label>
            ))}
          </fieldset>
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
