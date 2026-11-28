'use server'

import { act, type ActionState } from '../act'

export async function addBrand(_: ActionState, form: FormData) {
  return act(
    'products.manage',
    async ({ catalog, store }) =>
      void (await catalog.createBrand(store.id, { name: form.get('name') as string })),
  )
}

// name/logo are inputs of the edit form, so `get` never returns null.
export async function updateBrand(_: ActionState, form: FormData) {
  return act('products.manage', async ({ catalog, media, store }) => {
    const id = String(form.get('id'))
    if (form.get('archive')) await catalog.archiveBrand(store.id, id)
    else {
      const file = form.get('logo') as File
      // No file picked keeps the current logo.
      const logoId =
        file.size > 0
          ? (await media.upload(store.id, 'logo', new Uint8Array(await file.arrayBuffer()))).id
          : undefined
      await catalog.updateBrand(store.id, id, { name: form.get('name') as string, logoId })
    }
    return '/admin/brands'
  })
}
