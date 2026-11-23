'use server'

import { optionsFromText } from '@/modules/catalog'
import { act, type ActionState } from '../act'

// Every key read here is an input of the variant forms, so `get` never returns null.
const text = (f: FormData, k: string) => f.get(k) as string
const minor = (s: string) => (s === '' ? null : Math.round(Number(s) * 100))

export async function saveOptions(_: ActionState, form: FormData) {
  return act('products.manage', ({ catalog, store }) =>
    catalog.setOptions(store.id, text(form, 'productId'), optionsFromText(text(form, 'options'))),
  )
}

export async function saveVariants(_: ActionState, form: FormData) {
  return act('products.manage', ({ catalog, store }) =>
    catalog.updateVariants(
      store.id,
      text(form, 'productId'),
      form.getAll('variant').map((v) => {
        const id = String(v)
        return {
          id,
          price: minor(text(form, `price-${id}`)) as number,
          compareAtPrice: minor(text(form, `compare-${id}`)),
          costPrice: minor(text(form, `cost-${id}`)) ?? 0,
          stock: Number(text(form, `stock-${id}`)),
          sku: text(form, `sku-${id}`) || null,
        }
      }),
    ),
  )
}
