import type { Metadata } from 'next'
import Link from 'next/link'
import { translate } from '@/i18n'
import { daysAgo, formatMoney } from '@/modules/shared'
import { runtime } from '@/server/runtime'
import { currentLocale, currentSettings, currentStore } from '@/server/request'
import { Icon } from '@/ui/icon'
import { Badge, Card } from '@/ui/primitives'
import { InsightsPanel } from './insights-panel'

export const metadata: Metadata = { title: 'Dashboard' }

type Search = Promise<{ range?: string; from?: string; to?: string; group?: string }>

export default async function Dashboard({ searchParams }: { searchParams: Search }) {
  const [store, locale, { container }, { business }] = await Promise.all([
    currentStore(),
    currentLocale(),
    runtime(),
    currentSettings(),
  ])
  const money = (minor: number) => formatMoney(minor, { currency: business.currency })
  const t = (k: string, v?: Record<string, string | number>) => translate(locale, k, v)
  const [pending, month, recent, low, cats, prods, ga4InAdmin, search, courierOn, pages] =
    await Promise.all([
      container.orders.listOrders(store.id, { status: 'PENDING', limit: 1 }),
      container.orders.listOrders(store.id, { from: daysAgo(30), limit: 1 }),
      container.orders.listOrders(store.id, { limit: 5 }),
      container.stock.lowStock(store.id),
      container.catalog.listCategories(store.id),
      container.catalog.listProducts(store.id),
      container.plans.has(store.id, 'ga4InAdmin'),
      searchParams,
      container.features.isOn(store.id, 'courier'),
      container.pages.list(store.id),
    ])
  // E5: what couriers charged for parcels sent in the last 30 days.
  const courierCost = courierOn ? await container.courier.chargesSince(store.id, daysAgo(30)) : null
  const steps = [
    { label: t('dash.step.category'), done: cats.length > 0, href: '/admin/categories' },
    { label: t('dash.step.product'), done: prods.length > 0, href: '/admin/products/new' },
    { label: t('dash.step.design'), done: false, href: '/admin/design' },
    // Shoppers trust a shop they can call and whose return rules they can read before paying.
    { label: t('dash.step.contact'), done: !!business.contact.phone, href: '/admin/store' },
    {
      label: t('dash.step.policies'),
      done: pages.some((pg) => pg.published),
      href: '/admin/pages',
    },
    { label: t('dash.step.order'), done: month.total > 0, href: '/' },
  ]
  return (
    <>
      <h1 className="font-heading text-3xl">{t('dash.title')}</h1>
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <p className="text-sm text-muted">{t('dash.pending')}</p>
          <p className="font-heading text-3xl" data-testid="kpi-pending">
            {pending.total}
          </p>
        </Card>
        <Card>
          <p className="text-sm text-muted">{t('dash.orders30')}</p>
          <p className="font-heading text-3xl" data-testid="kpi-orders">
            {month.total}
          </p>
        </Card>
        {courierCost !== null && (
          <Card>
            <p className="text-sm text-muted">{t('dash.courierCost')}</p>
            <p className="font-heading text-3xl" data-testid="kpi-courier-cost">
              {money(courierCost)}
            </p>
          </Card>
        )}
      </div>
      <InsightsPanel
        insights={container.insights}
        storeId={store.id}
        search={search}
        ga4InAdmin={ga4InAdmin}
        t={t}
        money={money}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-semibold">{t('dash.recent')}</h2>
          {recent.rows.length === 0 ? (
            <p className="text-sm text-muted">{t('dash.recentEmpty')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {recent.rows.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex min-h-11 items-center justify-between gap-3 py-2"
                  >
                    <span className="font-semibold">#{o.orderNo}</span>
                    <span className="flex-1 truncate text-sm text-muted">{o.shipName}</span>
                    <span className="font-semibold">{money(o.total)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 font-semibold">
              <Icon name="alert" size={18} className="text-warning" />
              {t('dash.lowStock')}
            </h2>
            {low.length === 0 ? (
              <p className="text-sm text-muted">{t('dash.lowStockEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {low.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{p.name}</span>
                    <Badge tone="warning">{t('dash.left', { n: p.stock })}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{t('dash.ready')}</h2>
            <ol className="flex flex-col gap-1">
              {steps.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="flex min-h-11 items-center gap-3 text-sm">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full border ${s.done ? 'border-success bg-success text-bg' : 'border-line'}`}
                    >
                      {s.done && <Icon name="check" size={14} />}
                    </span>
                    <span className={s.done ? 'text-muted line-through' : ''}>{s.label}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </>
  )
}
