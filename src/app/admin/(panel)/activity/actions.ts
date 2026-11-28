'use server'

import { revalidateTag } from 'next/cache'
import { currentSettings } from '@/server/request'
import type { ProductInput } from '@/modules/catalog'
import { act, type ActionState } from '../act'

/** Puts a settings part or a product back to how it was before the logged change; the undo is logged too. */
export async function undoActivity(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ activity, settings, catalog, store }) => {
    const e = await activity.forUndo(store.id, String(form.get('id')))
    const { version } = await currentSettings()
    const save = {
      'settings.design': settings.saveDesign,
      'settings.business': settings.saveBusiness,
      'settings.layout': settings.saveLayout,
      // The product as it was; its id is in the snapshot.
      'product.update': (storeId: string, before: unknown) =>
        catalog.updateProduct(storeId, (before as { id: string }).id, before as ProductInput),
    }[e.action]
    await save(store.id, e.before, version)
    await activity.markUndone(store.id, e.id)
    revalidateTag(`store:${store.id}`, 'max')
  })
}
