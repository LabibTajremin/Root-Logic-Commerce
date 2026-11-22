'use server'

import type { BadgeTone } from '@/modules/catalog'
import { act, type ActionState } from '../act'

// Every key below is an input of the product form, so `get` never returns null here.
const field = (f: FormData, k: string) => f.get(k) as string
const minor = (s: string) => (s === '' ? null : Math.round(Number(s) * 100))

const readProduct = (f: FormData) => ({
  name: field(f, 'name'),
  slug: field(f, 'slug') || undefined,
  description: field(f, 'description'),
  // The field is required; a blank tampered value stays null and fails validation.
  price: minor(field(f, 'price')) as number,
  compareAtPrice: minor(field(f, 'compareAtPrice')),
  costPrice: minor(field(f, 'costPrice')) ?? 0,
  stock: Number(field(f, 'stock')),
  lowStockThreshold: Number(field(f, 'lowStockThreshold')),
  sku: field(f, 'sku') || null,
  status: field(f, 'status') as 'draft' | 'active' | 'archived',
  categoryId: field(f, 'categoryId') || null,
  seoTitle: field(f, 'seoTitle') || null,
  seoDescription: field(f, 'seoDescription') || null,
  // An empty badge text means "no badge".
  badge: field(f, 'badgeText').trim()
    ? { text: field(f, 'badgeText'), tone: field(f, 'badgeTone') as BadgeTone }
    : null,
})

export async function saveProduct(_: ActionState, form: FormData) {
  return act('products.manage', async ({ catalog, store }) => {
    const id = form.get('id') as string | null
    const data = readProduct(form)
    if (id) await catalog.updateProduct(store.id, id, data)
    else await catalog.createProduct(store.id, data)
    return '/admin/products'
  })
}

export async function reorderProducts(ids: string[]) {
  return act('products.manage', ({ catalog, store }) => catalog.reorderProducts(store.id, ids))
}
