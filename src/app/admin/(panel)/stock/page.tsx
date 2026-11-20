import type { Metadata } from 'next'
import { helpText } from '@/help'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card, Field, HelpHint } from '@/ui/primitives'
import { adminContext } from '../context'
import { adjustStock } from './actions'

export const metadata: Metadata = { title: 'Stock' }

export default async function StockPage() {
  const { stock, catalog, store, locale, t } = await adminContext('stock.manage')
  const [low, history, products] = await Promise.all([
    stock.lowStock(store.id),
    stock.history(store.id),
    catalog.listProducts(store.id),
  ])
  const names = new Map(products.map((p) => [p.id, p.name]))
  return (
    <>
      <h1 className="font-heading text-3xl">{t('stock.title')}</h1>
      <p className="text-sm text-muted">{t('stock.hint')}</p>
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-5">
          <Card>
            <h2 className="mb-3 font-semibold">{t('stock.low')}</h2>
            {low.length === 0 ? (
              <p className="text-sm text-muted">{t('stock.lowEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-2" data-testid="low-stock">
                {low.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <span>{p.name}</span>
                    <Badge tone={p.stock === 0 ? 'danger' : 'warning'}>
                      {t('dash.left', { n: p.stock })}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="mb-3 font-semibold">{t('stock.history')}</h2>
            {history.length === 0 ? (
              <p className="text-sm text-muted">{t('stock.historyEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm" data-testid="stock-history">
                {history.map((m) => (
                  <li
                    key={m.createdAt.toISOString() + m.productId + m.delta}
                    className="flex gap-3"
                  >
                    <span
                      className={`w-12 font-semibold ${m.delta > 0 ? 'text-success' : 'text-danger'}`}
                    >
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                    <span className="flex-1">
                      {names.get(m.productId)}
                      <span className="block text-xs text-muted">
                        {t(`stock.reason.${m.reason}`)}
                        {m.note ? ` · ${m.note}` : ''}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
        <Card>
          <ActionForm
            action={adjustStock}
            className="flex flex-col gap-4"
            saved={t('common.saved')}
          >
            <h2 className="font-semibold">{t('stock.adjust')}</h2>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <label htmlFor="productId" className="text-sm font-semibold">
                  {t('stock.product')}
                </label>
                <HelpHint
                  id="productId"
                  text={helpText(locale, 'stock.product')}
                  label={t('common.help')}
                />
              </div>
              <select
                id="productId"
                name="productId"
                required
                className="min-h-11 rounded-control border border-line bg-surface px-3"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.stock})
                  </option>
                ))}
              </select>
            </div>
            <Field
              id="delta"
              name="delta"
              type="number"
              required
              label={t('stock.delta')}
              help={helpText(locale, 'stock.delta')}
              helpLabel={t('common.help')}
            />
            <Field
              id="note"
              name="note"
              required
              label={t('stock.reason')}
              help={helpText(locale, 'stock.reason')}
              helpLabel={t('common.help')}
            />
            <Button type="submit" icon="check">
              {t('common.save')}
            </Button>
          </ActionForm>
        </Card>
      </div>
    </>
  )
}
