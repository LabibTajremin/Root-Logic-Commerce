import type { Metadata } from 'next'
import { Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { ProductForm } from '../product-form'

export const metadata: Metadata = { title: 'New product' }

export default async function NewProduct() {
  const { catalog, store, locale, t } = await adminContext('products.manage')
  return (
    <>
      <h1 className="font-heading text-3xl">{t('products.new')}</h1>
      <ProductForm
        categories={await catalog.listCategories(store.id)}
        brands={await catalog.listBrands(store.id)}
        locale={locale}
      />
      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('media.title')}</h2>
        <p className="text-sm text-muted">{t('media.saveFirst')}</p>
      </Card>
    </>
  )
}
