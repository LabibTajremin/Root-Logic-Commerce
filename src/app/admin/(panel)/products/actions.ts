'use server'

import { act, type ActionState } from '../act'

const toMinor = (v: FormDataEntryValue | null) =>
  v === null || v === '' ? null : Math.round(Number(v) * 100)
const text = (v: FormDataEntryValue | null) => (v === null || v === '' ? null : String(v))

const readProduct = (f: FormData) => ({
  name: String(f.get('name') ?? ''),
  slug: text(f.get('slug')) ?? undefined,
  description: String(f.get('description') ?? ''),
  price: toMinor(f.get('price')) ?? Number.NaN,
  compareAtPrice: toMinor(f.get('compareAtPrice')),
  costPrice: toMinor(f.get('costPrice')) ?? 0,
  stock: Number(f.get('stock') || 0),
  lowStockThreshold: Number(f.get('lowStockThreshold') || 5),
  sku: text(f.get('sku')),
  status: String(f.get('status')) as 'draft' | 'active' | 'archived',
  categoryId: text(f.get('categoryId')),
  seoTitle: text(f.get('seoTitle')),
  seoDescription: text(f.get('seoDescription')),
})

export async function saveProduct(_: ActionState, form: FormData) {
  const id = text(form.get('id'))
  return act('products.manage', async ({ catalog, store }) => {
    const data = readProduct(form)
    if (id) await catalog.updateProduct(store.id, id, data)
    else await catalog.createProduct(store.id, data)
    return '/admin/products'
  })
}

export async function reorderProducts(ids: string[]) {
  return act('products.manage', ({ catalog, store }) => catalog.reorderProducts(store.id, ids))
}
