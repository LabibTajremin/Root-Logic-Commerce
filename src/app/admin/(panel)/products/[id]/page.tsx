import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isUuid } from '@/modules/shared'
import { adminContext } from '../../context'
import { ProductForm } from '../product-form'
import { ProductImages } from './product-images'
import { ProductVariants } from './variants'

export const metadata: Metadata = { title: 'Edit product' }

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!isUuid(id)) notFound()
  const { catalog, store, locale, t } = await adminContext('products.manage')
  const product = await catalog.getProduct(store.id, id)
  if (!product) notFound()
  return (
    <>
      <h1 className="font-heading text-3xl">{t('products.edit')}</h1>
      <ProductForm
        product={product}
        categories={await catalog.listCategories(store.id)}
        brands={await catalog.listBrands(store.id)}
        locale={locale}
      />
      <ProductImages productId={product.id} />
      <ProductVariants
        product={product}
        variants={await catalog.listVariants(store.id, [product.id])}
        t={t}
      />
    </>
  )
}
