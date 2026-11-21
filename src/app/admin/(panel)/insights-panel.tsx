import { groups, rangeKeys, type Insights } from '@/modules/insights'
import { formatMoney } from '@/modules/shared'
import { Button, Card, LockBadge } from '@/ui/primitives'

type Search = { range?: string; from?: string; to?: string; group?: string }
type Props = {
  insights: Insights
  storeId: string
  search: Search
  ga4InAdmin: boolean
  t: (k: string, v?: Record<string, string | number>) => string
}

const pct = (n: number) => `${(n * 100).toFixed(1)}%`

export const InsightsPanel = async ({ insights, storeId, search, ga4InAdmin, t }: Props) => {
  const key = rangeKeys.find((k) => k === search.range) ?? '30d'
  const report = await insights.report(storeId, key, search)
  const s = report.summary
  const kpis: [string, string][] = [
    ['visitors', String(s.visitors)],
    ['pageViews', String(s.pageViews)],
    ['ordersPlaced', String(s.ordersPlaced)],
    ['ordersConfirmed', String(s.ordersConfirmed)],
    ['ordersDelivered', String(s.ordersDelivered)],
    ['ordersCancelled', String(s.ordersCancelled)],
    ['ordersReturned', String(s.ordersReturned)],
    ['revenue', formatMoney(s.revenue)],
    ['cost', formatMoney(s.cost)],
    ['grossProfit', formatMoney(s.grossProfit)],
    ['aov', formatMoney(s.aov)],
    ['conversion', pct(s.conversion)],
  ]
  const peak = Math.max(1, ...report.series.map((p) => p.pageViews))
  const field = 'min-h-11 rounded-control border border-line bg-surface px-3'
  return (
    <Card className="flex flex-col gap-5">
      <form className="flex flex-wrap items-end gap-3" aria-label={t('insights.title')}>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('insights.range')}
          <select name="range" defaultValue={key} className={field}>
            {rangeKeys.map((k) => (
              <option key={k} value={k}>
                {t(`insights.range.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('insights.from')}
          <input type="date" name="from" defaultValue={search.from} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('insights.to')}
          <input type="date" name="to" defaultValue={search.to} className={field} />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('insights.group')}
          <select name="group" defaultValue={report.range.group} className={field}>
            {groups.map((g) => (
              <option key={g} value={g}>
                {t(`insights.group.${g}`)}
              </option>
            ))}
          </select>
        </label>
        <Button variant="secondary">{t('common.view')}</Button>
      </form>
      {report.fellBack && (
        <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm text-danger">
          {t('error.insights.range')}
        </p>
      )}
      <p className="text-sm text-muted" data-testid="insights-range">
        {report.range.from} → {report.range.to}
      </p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map(([k, v]) => (
          <div key={k} className="rounded-control bg-soft p-3">
            <dt className="text-xs text-muted">{t(`insights.${k}`)}</dt>
            <dd className="font-heading text-2xl" data-testid={`insight-${k}`}>
              {v}
            </dd>
          </div>
        ))}
      </dl>
      <figure className="flex flex-col gap-2">
        <figcaption className="text-sm font-semibold">{t('insights.pageViews')}</figcaption>
        <ol className="flex h-32 items-end gap-1" aria-label={t('insights.pageViews')}>
          {report.series.map((p) => (
            <li
              key={p.bucket}
              title={`${p.bucket}: ${p.pageViews}`}
              className="min-w-1 flex-1 rounded-t bg-accent"
              style={{ height: `${Math.max(2, (p.pageViews / peak) * 100)}%` }}
            />
          ))}
        </ol>
      </figure>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">{t('insights.top')}</h2>
          {report.top.length === 0 ? (
            <p className="text-sm text-muted">{t('insights.topEmpty')}</p>
          ) : (
            <ol className="flex flex-col gap-1 text-sm" data-testid="top-products">
              {report.top.map((p) => (
                <li key={p.name} className="flex justify-between gap-2">
                  <span className="truncate">{p.name}</span>
                  <span className="text-muted">
                    × {p.quantity} · {formatMoney(p.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="font-semibold">{t('insights.ga4')}</h2>
          {ga4InAdmin ? (
            <p className="text-sm text-muted">{t('insights.ga4Soon')}</p>
          ) : (
            <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
              {t('insights.ga4Locked')} <LockBadge label={t('common.premium')} />
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}
