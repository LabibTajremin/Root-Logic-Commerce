import type { Metadata } from 'next'
import { parseEmbed } from '@/modules/promotions'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { Locked } from '../locked'
import { addReel, moveReel, removeReel } from './actions'

export const metadata: Metadata = { title: 'Reels' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
const small = 'min-h-11 rounded-control border border-line px-3 text-sm font-semibold'

/** B4: short videos with the products in them, shown as a cover-flow carousel. */
export default async function ReelsAdmin() {
  const { t, features, reels, catalog, store } = await adminContext('settings.manage')
  if (!(await features.isOn(store.id, 'reels')))
    return <Locked title={t('reels.admin')} text={t('reels.locked')} t={t} />
  const [list, all] = await Promise.all([
    reels.list(store.id),
    catalog.listProducts(store.id, { status: 'active' }),
  ])
  const products = all.filter((p) => p.options.length === 0)
  const names = new Map(all.map((p) => [p.id, p.name]))
  return (
    <>
      <h1 className="font-heading text-3xl">{t('reels.admin')}</h1>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('reels.new')}</h2>
        <p className="text-sm text-muted">{t('reels.help')}</p>
        <ActionForm action={addReel} className="flex flex-col gap-3" saved={t('common.saved')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t('reels.link')}
              <input name="url" type="url" className={field} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t('reels.video')}
              <input
                name="video"
                type="file"
                accept="video/mp4,video/webm"
                className={`${field} py-2`}
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t('reels.cover')}
              <input name="cover" type="file" accept="image/*" className={`${field} py-2`} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold">
              {t('reels.caption')}
              <input name="caption" maxLength={120} className={field} />
            </label>
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="flex flex-col gap-1.5 text-sm font-semibold">
                {t('reels.product', { n: i + 1 })}
                <select name={`product${i}`} className={field}>
                  <option value="">—</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
            {t('reels.add')}
          </button>
        </ActionForm>
      </Card>
      {list.length === 0 ? (
        <Card>
          <p className="text-muted">{t('reels.empty')}</p>
        </Card>
      ) : (
        <ol className="flex flex-col gap-3">
          {list.map((r, i) => (
            <li key={r.id} data-testid={`reel-${i}`}>
              <Card className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold">{r.caption || t('reels.reel')}</p>
                  <p className="text-sm text-muted">
                    {r.url ? parseEmbed(r.url)!.provider : t('reels.uploaded')}
                    {r.productIds.length > 0 &&
                      ` · ${r.productIds.map((id) => names.get(id) ?? '?').join(', ')}`}
                  </p>
                </div>
                {([-1, 1] as const).map((dir) => (
                  <ActionForm key={dir} action={moveReel}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="dir" value={dir} />
                    <button
                      className={small}
                      aria-label={t(dir < 0 ? 'reels.up' : 'reels.down', { n: i + 1 })}
                    >
                      {dir < 0 ? '↑' : '↓'}
                    </button>
                  </ActionForm>
                ))}
                <ActionForm action={removeReel}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className={small}>{t('reels.remove')}</button>
                </ActionForm>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
