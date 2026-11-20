'use server'

import { act, type ActionState } from '../act'

// productId/mediaId/link/file are inputs of the image forms, so `get` never returns null.
const text = (f: FormData, k: string) => f.get(k) as string

export async function uploadImage(_: ActionState, form: FormData) {
  return act('products.manage', async ({ media, store }) => {
    const file = form.get('file') as File
    const m = await media.upload(store.id, 'product', new Uint8Array(await file.arrayBuffer()))
    await media.attach(store.id, text(form, 'productId'), m.id)
  })
}

export async function addDriveImage(_: ActionState, form: FormData) {
  return act('products.manage', async ({ media, store }) => {
    const m = await media.addDriveLink(store.id, text(form, 'link'))
    await media.attach(store.id, text(form, 'productId'), m.id)
  })
}

export async function removeImage(_: ActionState, form: FormData) {
  return act('products.manage', ({ media, store }) =>
    media.detach(store.id, text(form, 'productId'), text(form, 'mediaId')),
  )
}
