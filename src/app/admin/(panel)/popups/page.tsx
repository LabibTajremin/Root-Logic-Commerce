import type { Metadata } from 'next'
import { popupKinds } from '@/modules/promotions'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { Locked } from '../locked'
import { addPopup, removePopup, togglePopup } from './actions'

export const metadata: Metadata = { title: 'Popups' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
const small = 'min-h-11 rounded-control border border-line px-3 text-sm font-semibold'

/** B8: offer, product promo, "your order isn't finished" and newsletter popups with show rules. */
export default async function PopupsAdmin() {
  const [{ t, features, catalog, store }, { business }] = await Promise.all([
    adminContext('settings.manage'),
    currentSettings(),
  ])
  if (!(await features.isOn(store.id, 'popups')))
    return <Locked title={t('popups.title')} text={t('popups.locked')} t={t} />
  const products = (await catalog.listProducts(store.id, { status: 'active' })).filter(
    (p) => p.options.length === 0,
  )
  const select = (name: string, label: string, options: readonly string[], key: string) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <select name={name} className={field}>
        {options.map((o) => (
          <option key={o} value={o}>
            {t(`${key}.${o}`)}
          </option>
        ))}
      </select>
    </label>
  )
  const input = (name: string, label: string, value = '', type = 'text') => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input name={name} type={type} defaultValue={value} className={field} />
    </label>
  )
  return (
    <>
      <h1 className="font-heading text-3xl">{t('popups.title')}</h1>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('popups.new')}</h2>
        <ActionForm
          action={addPopup}
          className="grid gap-3 sm:grid-cols-2"
          saved={t('common.saved')}
        >
          {select('kind', t('popups.kindLabel'), popupKinds, 'popups.kind')}
          {input('title', t('popups.titleLabel'))}
          {input('text', t('popups.text'))}
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('popups.product')}
            <select name="productId" className={field}>
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {input('cta', t('popups.cta'))}
          {input('href', t('popups.href'))}
          {select(
            'pages',
            t('popups.pagesLabel'),
            ['all', 'home', 'product', 'checkout'],
            'popups.pages',
          )}
          {select(
            'trigger',
            t('popups.triggerLabel'),
            ['delay', 'scroll', 'exit'],
            'popups.trigger',
          )}
          {input('delay', t('popups.delay'), '5', 'number')}
          {input('scroll', t('popups.scroll'), '50', 'number')}
          {input('everyDays', t('popups.everyDays'), '1', 'number')}
          {select('device', t('popups.deviceLabel'), ['all', 'mobile', 'desktop'], 'popups.device')}
          <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
            {t('popups.add')}
          </button>
        </ActionForm>
      </Card>
      {business.popups.length === 0 ? (
        <Card>
          <p className="text-muted">{t('popups.empty')}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {business.popups.map((p) => (
            <li key={p.id} data-testid={`popup-${p.title}`}>
              <Card className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{p.title}</p>
                  <p className="text-sm text-muted">
                    {t(`popups.kind.${p.kind}`)} · {t(`popups.pages.${p.pages}`)} ·{' '}
                    {t(`popups.trigger.${p.trigger}`)}
                    {!p.on && ` · ${t('combos.off')}`}
                  </p>
                </div>
                <ActionForm action={togglePopup}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className={small}>{t(p.on ? 'combos.turnOff' : 'combos.turnOn')}</button>
                </ActionForm>
                <ActionForm action={removePopup}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className={small}>{t('combos.remove')}</button>
                </ActionForm>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
