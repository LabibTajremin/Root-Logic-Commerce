import type { Metadata } from 'next'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { endFlashSale, saveFlashSale } from '../deals-actions'
import { Locked } from '../locked'

export const metadata: Metadata = { title: 'Flash sale' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
// Shown in Bangladesh time (UTC+6), the way it was typed.
const dhaka = (d: Date | undefined) =>
  d ? new Date(d.getTime() + 6 * 3_600_000).toISOString().slice(0, 16) : ''

/** B11: one sale at a time; prices go back by themselves when it ends or a product's cap sells. */
export default async function FlashSaleAdmin() {
  const [{ t, features, catalog, store, money }, { business }] = await Promise.all([
    adminContext('products.manage'),
    currentSettings(),
  ])
  if (!(await features.isOn(store.id, 'flashSales')))
    return <Locked title={t('flash.title')} text={t('flash.locked')} t={t} />
  const sale = business.flashSale
  const products = await catalog.listProducts(store.id, { status: 'active' })
  const input = (name: string, label: string, value: string, type = 'text') => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input name={name} type={type} defaultValue={value} className={field} />
    </label>
  )
  return (
    <>
      <h1 className="font-heading text-3xl">{t('flash.title')}</h1>
      <ActionForm action={saveFlashSale} className="flex flex-col gap-4" saved={t('common.saved')}>
        <Card className="grid gap-3 sm:grid-cols-2">
          {input('name', t('flash.name'), sale?.name ?? '')}
          {input('cap', t('flash.capLabel'), sale?.cap ? String(sale.cap) : '', 'number')}
          {input('startsAt', t('flash.starts'), dhaka(sale?.startsAt), 'datetime-local')}
          {input('endsAt', t('flash.ends'), dhaka(sale?.endsAt), 'datetime-local')}
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="on" defaultChecked={sale?.on ?? true} className="size-5" />
            {t('flash.running')}
          </label>
        </Card>
        <Card className="flex flex-col gap-3">
          <h2 className="font-semibold">{t('flash.products')}</h2>
          <p className="text-sm text-muted">{t('flash.productsHelp')}</p>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const item = sale?.items[i]
            return (
              <div key={i} className="grid gap-3 sm:grid-cols-[1fr_8rem_6rem]">
                <label className="flex flex-col gap-1.5 text-sm font-semibold">
                  {t('flash.product', { n: i + 1 })}
                  <select
                    name={`product${i}`}
                    defaultValue={item?.productId ?? ''}
                    className={field}
                  >
                    <option value="">—</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({money(p.price)})
                      </option>
                    ))}
                  </select>
                </label>
                {input(
                  `price${i}`,
                  t('flash.price', { n: i + 1 }),
                  item?.price ? String(item.price / 100) : '',
                  'number',
                )}
                {input(
                  `percent${i}`,
                  t('flash.percent', { n: i + 1 }),
                  item?.percent ? String(item.percent) : '',
                  'number',
                )}
              </div>
            )
          })}
        </Card>
        <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
          {t('common.save')}
        </button>
      </ActionForm>
      {sale && (
        <ActionForm action={endFlashSale}>
          <button className="min-h-11 rounded-control border border-danger px-3 text-sm font-semibold text-danger">
            {t('flash.end')}
          </button>
        </ActionForm>
      )}
    </>
  )
}
