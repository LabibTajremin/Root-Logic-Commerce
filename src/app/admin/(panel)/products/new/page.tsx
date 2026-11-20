import type { Metadata } from 'next'
import { adminContext } from '../../context'
import { ProductForm } from '../product-form'

export const metadata: Metadata = { title: 'New product' }

export default async function NewProduct() {
  const { catalog, store, locale, t } = await adminContext('products.manage')
  return (
    <>
      <h1 className="font-heading text-3xl">{t('products.new')}</h1>
      <ProductForm categories={await catalog.listCategories(store.id)} locale={locale} />
    </>
  )
}
