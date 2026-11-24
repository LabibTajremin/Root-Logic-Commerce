import type { Metadata } from 'next'
import Link from 'next/link'
import { variantLabel } from '@/modules/catalog'
import { orderSources } from '@/modules/orders'
import { currentSettings } from '@/server/request'
import { Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { NewOrderForm } from './new-order-form'

export const metadata: Metadata = { title: 'New order' }

const KEYS = ['phone', 'find', 'found', 'notFound', 'name', 'district', 'area', 'address']
const MORE = ['items', 'product', 'qty', 'remove', 'addLine', 'zone', 'discount', 'source']

export default async function NewOrderPage() {
  const { catalog, store, t, money } = await adminContext('orders.manage')
  const { business } = await currentSettings()
  const active = await catalog.listProducts(store.id, { status: 'active' })
  const variants = await catalog.listVariants(
    store.id,
    active.map((p) => p.id),
  )
  // A product with options is sold as one of its variants, like at checkout.
  const products = active.flatMap((p) =>
    p.options.length === 0
      ? [{ value: `${p.id}:`, label: `${p.name} — ${money(p.price)}` }]
      : variants
          .filter((v) => v.productId === p.id)
          .map((v) => ({
            value: `${p.id}:${v.id}`,
            label: `${p.name} (${variantLabel(p.options, v.options)}) — ${money(v.price)}`,
          })),
  )
  const labels = {
    ...Object.fromEntries([...KEYS, ...MORE].map((k) => [k, t(`manual.${k}`)])),
    note: t('manual.note'),
    create: t('manual.create'),
  }
  return (
    <>
      <Link href="/admin/orders" className="text-sm font-semibold underline">
        {t('orders.title')}
      </Link>
      <h1 className="font-heading text-3xl">{t('manual.title')}</h1>
      <Card>
        <NewOrderForm
          products={products}
          zones={business.deliveryZones.map((z) => ({
            value: z.id,
            label: `${z.label} — ${money(z.charge)}`,
          }))}
          sources={orderSources.map((s) => ({ value: s, label: t(`source.${s}`) }))}
          labels={labels}
        />
      </Card>
    </>
  )
}
