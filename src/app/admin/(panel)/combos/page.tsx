import type { Metadata } from 'next'
import { comboPercent } from '@/modules/deals'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { addCombo, removeCombo, toggleCombo } from '../deals-actions'
import { Locked } from '../locked'

export const metadata: Metadata = { title: 'Combos' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
const small = 'min-h-11 rounded-control border border-line px-3 text-sm font-semibold'

/** A9: bundles of plain products at one price; shoppers add the whole set at once. */
export default async function CombosAdmin() {
  const [{ t, features, catalog, store, money }, { business }] = await Promise.all([
    adminContext('products.manage'),
    currentSettings(),
  ])
  if (!(await features.isOn(store.id, 'combos')))
    return <Locked title={t('combos.title')} text={t('combos.locked')} t={t} />
  // Products with options are bought as a variant, so a combo holds plain products only.
  const products = (await catalog.listProducts(store.id, { status: 'active' })).filter(
    (p) => p.options.length === 0,
  )
  const byId = new Map(products.map((p) => [p.id, p]))
  return (
    <>
      <h1 className="font-heading text-3xl">{t('combos.title')}</h1>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('combos.new')}</h2>
        <ActionForm action={addCombo} className="flex flex-col gap-3" saved={t('common.saved')}>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t('combos.name')}
              <input name="name" required className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t('combos.slug')}
              <input name="slug" required className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t('combos.price')}
              <input name="price" type="number" min="1" required className={field} />
            </label>
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem] gap-3">
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t('combos.item', { n: i + 1 })}
                <select name={`product${i}`} className={field} required={i < 2}>
                  <option value="">—</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({money(p.price)})
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold">
                {t('combos.qty', { n: i + 1 })}
                <input
                  name={`qty${i}`}
                  type="number"
                  min="1"
                  max="10"
                  defaultValue="1"
                  className={field}
                />
              </label>
            </div>
          ))}
          <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
            {t('combos.create')}
          </button>
        </ActionForm>
      </Card>
      {business.combos.length === 0 ? (
        <Card>
          <p className="text-muted">{t('combos.empty')}</p>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3">
          {business.combos.map((c) => {
            const full = c.items.reduce(
              (n, i) => n + (byId.get(i.productId)?.price ?? 0) * i.qty,
              0,
            )
            return (
              <li key={c.id} data-testid={`combo-row-${c.slug}`}>
                <Card className="flex flex-wrap items-center gap-3">
                  <div className="flex-1">
                    <p className="font-semibold">
                      {c.name} · {money(c.price)} ·{' '}
                      {t('combos.less', { pct: comboPercent(full, c.price) })}
                    </p>
                    <p className="text-sm text-muted">
                      {c.items
                        .map((i) => `${i.qty} × ${byId.get(i.productId)?.name ?? '?'}`)
                        .join(', ')}
                      {!c.on && ` · ${t('combos.off')}`}
                    </p>
                  </div>
                  <ActionForm action={toggleCombo}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className={small}>
                      {t(c.on ? 'combos.turnOff' : 'combos.turnOn')}
                    </button>
                  </ActionForm>
                  <ActionForm action={removeCombo}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className={small}>{t('combos.remove')}</button>
                  </ActionForm>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
