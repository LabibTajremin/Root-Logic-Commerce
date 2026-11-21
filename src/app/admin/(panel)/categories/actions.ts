'use server'

import { act, type ActionState } from '../act'

// Both are inputs of every category form, so `get` never returns null here.
const read = (f: FormData) => ({
  name: f.get('name') as string,
  parentId: (f.get('parentId') as string) || null,
})

export async function addCategory(_: ActionState, form: FormData) {
  return act(
    'products.manage',
    async ({ catalog, store }) => void (await catalog.createCategory(store.id, read(form))),
  )
}

export async function updateCategory(_: ActionState, form: FormData) {
  return act('products.manage', async ({ catalog, store }) => {
    const id = String(form.get('id'))
    if (form.get('archive')) await catalog.archiveCategory(store.id, id)
    else await catalog.updateCategory(store.id, id, read(form))
    return '/admin/categories'
  })
}

export async function reorderCategories(ids: string[]) {
  return act('products.manage', ({ catalog, store }) => catalog.reorderCategories(store.id, ids))
}
