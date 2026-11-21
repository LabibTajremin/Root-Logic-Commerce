'use server'

import { revalidateTag } from 'next/cache'
import { act } from '../act'

// FormData (not JSON args): keeps the request shape every other admin action uses.
export async function publishDesign(form: FormData) {
  return act('settings.manage', async ({ settings, store }) => {
    await settings.saveDesign(
      store.id,
      JSON.parse(String(form.get('design'))),
      Number(form.get('version')),
    )
    revalidateTag(`store:${store.id}`, 'max')
  })
}
