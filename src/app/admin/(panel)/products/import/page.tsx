import type { Metadata } from 'next'
import { csvColumns } from '@/modules/catalog'
import { Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { ImportForm } from './import-form'

export const metadata: Metadata = { title: 'Import products' }

const errorKeys = [
  'columns',
  'slug',
  'name',
  'price',
  'stock',
  'status',
  'variant',
  'product',
  'category',
  'compareAtPrice',
  'sku',
  'description',
]

export default async function ImportPage() {
  const { t } = await adminContext('products.manage')
  return (
    <>
      <h1 className="font-heading text-3xl">{t('csv.title')}</h1>
      <Card className="flex flex-col gap-3">
        <p className="text-sm">{t('csv.hint')}</p>
        <code className="break-all rounded-control bg-soft p-2 text-xs">
          {csvColumns.join(',')}
        </code>
        {/* A plain GET form: the response is a file download, not a page. */}
        <form action="/admin/products/export" method="get">
          <button className="min-h-11 text-sm font-semibold underline">{t('csv.export')}</button>
        </form>
      </Card>
      <Card>
        <ImportForm
          labels={{
            file: t('csv.file'),
            check: t('csv.check'),
            apply: t('csv.apply'),
            line: t('csv.line'),
            action: t('csv.action'),
            problems: t('csv.problems'),
            ready: t('csv.ready'),
            fix: t('csv.fix'),
            done: t('csv.done'),
            actions: {
              create: t('csv.create'),
              update: t('csv.update'),
              variant: t('csv.variant'),
            },
            errors: Object.fromEntries(errorKeys.map((k) => [k, t(`csv.error_${k}`)])),
          }}
        />
      </Card>
    </>
  )
}
