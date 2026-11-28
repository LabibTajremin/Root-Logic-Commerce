import type { Metadata } from 'next'
import Link from 'next/link'
import { conversion, landingDesigns } from '@/modules/landing'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { copyLanding, createLandingPage, saveLandingPrefix, toggleLanding } from './actions'

export const metadata: Metadata = { title: 'Landing pages' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
const button = 'min-h-11 rounded-control border border-line px-3 text-sm font-semibold'

type Props = { searchParams: Promise<{ q?: string; design?: string }> }

/** H5: every landing page with its visitors, orders and conversion; make one from a product. */
export default async function LandingPages({ searchParams }: Props) {
  const [{ t, landing, catalog, store }, { business }, params] = await Promise.all([
    adminContext('settings.manage'),
    currentSettings(),
    searchParams,
  ])
  const q = (params.q ?? '').trim().toLowerCase()
  const [pages, products] = await Promise.all([
    landing.list(store.id),
    catalog.listProducts(store.id, { status: 'active' }),
  ])
  const prefix = business.landing.prefix
  const rows = pages.filter(
    (p) =>
      (!q || `${p.title} ${p.slug}`.toLowerCase().includes(q)) &&
      (!params.design || p.design === params.design),
  )
  const designs = landingDesigns.map((d) => (
    <option key={d} value={d}>
      {t(`landing.design.${d}`)}
    </option>
  ))
  return (
    <>
      <h1 className="font-heading text-3xl">{t('landing.title')}</h1>
      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('landing.new')}</h2>
        <ActionForm action={createLandingPage} className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('landing.product')}
            <select name="productId" required className={field}>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('landing.designLabel')}
            <select name="design" className={field}>
              {designs}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('landing.pageTitle')}
            <input name="title" required className={field} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('landing.slug', { prefix })}
            <input name="slug" required pattern="[a-zA-Z0-9\-]+" className={field} />
          </label>
          <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
            {t('landing.create')}
          </button>
        </ActionForm>
      </Card>

      <form className="flex flex-wrap items-end gap-2" role="search">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('common.search')}
          <input name="q" defaultValue={params.q} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('landing.designLabel')}
          <select name="design" defaultValue={params.design ?? ''} className={field}>
            <option value="">{t('orders.all')}</option>
            {designs}
          </select>
        </label>
        <button className={button}>{t('common.search')}</button>
      </form>

      {rows.length === 0 ? (
        <Card>
          <p className="text-muted">{t('landing.empty')}</p>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-soft">
              <tr>
                <th className="p-3">{t('landing.page')}</th>
                <th className="p-3">{t('landing.designLabel')}</th>
                <th className="p-3">{t('landing.visitors')}</th>
                <th className="p-3">{t('landing.orders')}</th>
                <th className="p-3">{t('landing.conversion')}</th>
                <th className="p-3">
                  <span className="sr-only">{t('landing.actions')}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const pct = conversion(p.visits, p.orders)
                return (
                  <tr key={p.id} data-testid={`landing-${p.slug}`} className="border-t border-line">
                    <td className="p-3">
                      <Link href={`/admin/landing/${p.id}`} className="font-semibold underline">
                        {p.title}
                      </Link>
                      <span className="block text-muted">
                        /{prefix}/{p.slug} {p.hidden && `· ${t('landing.hidden')}`}
                      </span>
                    </td>
                    <td className="p-3">{t(`landing.design.${p.design}`)}</td>
                    <td className="p-3">{p.visits}</td>
                    <td className="p-3">{p.orders}</td>
                    <td className="p-3">{pct === null ? '—' : `${pct}%`}</td>
                    <td className="flex flex-wrap gap-2 p-3">
                      <ActionForm action={toggleLanding}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="hidden" value={String(!p.hidden)} />
                        <button className={button}>
                          {t(p.hidden ? 'landing.show' : 'landing.hide')}
                        </button>
                      </ActionForm>
                      <ActionForm action={copyLanding}>
                        <input type="hidden" name="id" value={p.id} />
                        <button className={button}>{t('landing.copy')}</button>
                      </ActionForm>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Card className="flex flex-col gap-3">
        <h2 className="font-semibold">{t('landing.prefixTitle')}</h2>
        <ActionForm
          action={saveLandingPrefix}
          className="flex flex-wrap items-end gap-2"
          saved={t('common.saved')}
        >
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('landing.prefix')}
            <input name="prefix" defaultValue={prefix} required className={field} />
          </label>
          <button className={button}>{t('common.save')}</button>
        </ActionForm>
      </Card>
    </>
  )
}
