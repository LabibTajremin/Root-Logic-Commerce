import type { Metadata } from 'next'
import { adminContext } from '../../context'
import { Card } from '@/ui/primitives'

export const metadata: Metadata = { title: 'Courier report' }

type Search = Promise<{ from?: string; to?: string; product?: string }>
const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
// Dates are typed in Dhaka time; the range covers whole days.
const day = (d: string | undefined, end: boolean) =>
  /^\d{4}-\d{2}-\d{2}$/.test(d ?? '')
    ? new Date(`${d}T${end ? '23:59:59' : '00:00:00'}+06:00`)
    : undefined

/** E3: how each courier does — sent, on the way, delivered, returned, success %, average days. */
export default async function CourierReportPage({ searchParams }: { searchParams: Search }) {
  const { courier, catalog, store, t } = await adminContext('orders.manage')
  const q = await searchParams
  const [rows, products] = await Promise.all([
    courier.report(store.id, {
      from: day(q.from, false),
      to: day(q.to, true),
      productId: q.product || undefined,
    }),
    catalog.listProducts(store.id),
  ])
  const cols = ['sent', 'moving', 'delivered', 'partial', 'returned'] as const
  return (
    <>
      <Card>
        <form className="flex flex-wrap items-end gap-3">
          {(['from', 'to'] as const).map((k) => (
            <div key={k} className="flex flex-col gap-1.5 text-sm font-semibold">
              <label htmlFor={`report-${k}`}>{t(`courier.${k}`)}</label>
              <input
                id={`report-${k}`}
                name={k}
                type="date"
                defaultValue={q[k]}
                className={field}
              />
            </div>
          ))}
          <div className="flex flex-col gap-1.5 text-sm font-semibold">
            <label htmlFor="report-product">{t('courier.product')}</label>
            <select id="report-product" name="product" defaultValue={q.product} className={field}>
              <option value="">{t('courier.allProducts')}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
            {t('courier.show')}
          </button>
        </form>
      </Card>
      <Card className="overflow-x-auto">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{t('courier.noParcels')}</p>
        ) : (
          <table className="w-full text-sm" data-testid="courier-report">
            <thead>
              <tr className="text-start text-muted">
                <th className="py-2 text-start">{t('courier.courier')}</th>
                {cols.map((c) => (
                  <th key={c} className="py-2 text-end">
                    {t(`courier.col.${c}`)}
                  </th>
                ))}
                <th className="py-2 text-end">{t('courier.col.success')}</th>
                <th className="py-2 text-end">{t('courier.col.days')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.provider} className="border-t border-line">
                  <th className="py-2 text-start font-semibold">{t(`courier.${r.provider}`)}</th>
                  {cols.map((c) => (
                    <td key={c} className="py-2 text-end">
                      {r[c]}
                    </td>
                  ))}
                  <td className="py-2 text-end">
                    {r.successPct === null ? '—' : `${r.successPct}%`}
                  </td>
                  <td className="py-2 text-end">{r.avgDays ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  )
}
