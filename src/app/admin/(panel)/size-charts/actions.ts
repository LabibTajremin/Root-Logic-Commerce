'use server'

import { chartFromText } from '@/modules/catalog'
import { act, type ActionState } from '../act'

// name/rows are inputs of every chart form, so `get` never returns null.
const read = (f: FormData) => ({
  name: f.get('name') as string,
  rows: chartFromText(f.get('rows') as string),
})

export async function addSizeChart(_: ActionState, form: FormData) {
  return act(
    'products.manage',
    async ({ catalog, store }) => void (await catalog.createSizeChart(store.id, read(form))),
  )
}

export async function updateSizeChart(_: ActionState, form: FormData) {
  return act('products.manage', async ({ catalog, store }) => {
    const id = String(form.get('id'))
    if (form.get('delete')) await catalog.deleteSizeChart(store.id, id)
    else await catalog.updateSizeChart(store.id, id, read(form))
    return '/admin/size-charts'
  })
}
