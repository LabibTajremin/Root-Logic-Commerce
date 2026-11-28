import type { Metadata } from 'next'
import Link from 'next/link'
import { helpText } from '@/help'
import { chartToText } from '@/modules/catalog'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, Field } from '@/ui/primitives'
import { adminContext } from '../context'
import { addSizeChart, updateSizeChart } from './actions'

export const metadata: Metadata = { title: 'Size charts' }

/** A5: reusable size tables, picked on a product or a whole category. */
export default async function SizeChartsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const { catalog, store, locale, t } = await adminContext('products.manage')
  const all = await catalog.listSizeCharts(store.id)
  const editing = all.find((c) => c.id === edit)
  const fields = (name?: string, rows?: string) => (
    <>
      <Field
        id="name"
        name="name"
        required
        defaultValue={name}
        label={t('sizeCharts.name')}
        help={helpText(locale, 'sizeChart.name')}
        helpLabel={t('common.help')}
      />
      <label htmlFor="rows" className="text-sm font-semibold">
        {t('sizeCharts.rows')}
      </label>
      <p id="rows-hint" className="text-xs text-muted">
        {t('sizeCharts.rowsHint')}
      </p>
      <textarea
        id="rows"
        name="rows"
        rows={6}
        required
        aria-describedby="rows-hint"
        defaultValue={rows}
        className="rounded-control border border-line bg-surface p-3 font-mono text-sm"
      />
    </>
  )
  return (
    <>
      <h1 className="font-heading text-3xl">{t('sizeCharts.title')}</h1>
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <Card className="flex flex-col gap-1">
          <ul className="peer flex flex-col divide-y divide-line">
            {all.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/admin/size-charts?edit=${c.id}`}
                  className="flex min-h-12 items-center font-semibold"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
          <p className="hidden text-muted peer-empty:block">{t('sizeCharts.empty')}</p>
        </Card>
        <Card>
          {editing ? (
            <ActionForm action={updateSizeChart} className="flex flex-col gap-3">
              <h2 className="font-semibold">{t('sizeCharts.edit')}</h2>
              <input type="hidden" name="id" value={editing.id} />
              {fields(editing.name, chartToText(editing.rows))}
              <div className="flex gap-2">
                <Button type="submit" icon="check" className="flex-1">
                  {t('common.save')}
                </Button>
                <Button type="submit" name="delete" value="1" variant="secondary">
                  {t('sizeCharts.delete')}
                </Button>
              </div>
            </ActionForm>
          ) : (
            <ActionForm action={addSizeChart} className="flex flex-col gap-3">
              <h2 className="font-semibold">{t('sizeCharts.add')}</h2>
              {fields()}
              <Button type="submit" icon="plus">
                {t('sizeCharts.add')}
              </Button>
            </ActionForm>
          )}
        </Card>
      </div>
    </>
  )
}
