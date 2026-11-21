import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/ui/icon'
import { Badge, Card } from '@/ui/primitives'
import { SortableList } from '@/ui/sortable-list'
import { adminContext } from '../context'
import { reorderProducts } from './actions'

export const metadata: Metadata = { title: 'Products' }

const TONE = { draft: 'neutral', active: 'success', archived: 'warning' } as const

export default async function ProductsPage() {
  const { catalog, store, t, money } = await adminContext('products.manage')
  const products = await catalog.listProducts(store.id)
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-heading text-3xl">{t('products.title')}</h1>
        <Link
          href="/admin/products/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-button px-4 text-sm font-semibold text-button-text"
        >
          <Icon name="plus" size={18} />
          {t('products.add')}
        </Link>
      </div>
      {products.length === 0 ? (
        <Card>
          <p className="text-muted">{t('products.empty')}</p>
        </Card>
      ) : (
        <SortableList
          handleLabel={t('common.reorder')}
          onReorder={reorderProducts}
          items={products.map((p) => ({
            id: p.id,
            content: (
              <Link
                href={`/admin/products/${p.id}`}
                className="flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1"
              >
                <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
                <Badge tone={TONE[p.status]}>{t(`status.${p.status}`)}</Badge>
                <span className="text-sm text-muted">{t('products.inStock', { n: p.stock })}</span>
                <span className="font-semibold">{money(p.price)}</span>
              </Link>
            ),
          }))}
        />
      )}
    </>
  )
}
