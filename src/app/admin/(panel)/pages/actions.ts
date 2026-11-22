'use server'

import { act, type ActionState } from '../act'

const read = (f: FormData) => ({
  slug: String(f.get('slug')),
  title: String(f.get('title')),
  body: String(f.get('body')),
  published: f.get('published') === 'on',
  inFooter: f.get('inFooter') === 'on',
})

export async function savePage(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ pages, store }) => {
    const id = String(form.get('id'))
    if (id) await pages.update(store.id, id, read(form))
    else await pages.create(store.id, read(form))
    return '/admin/pages'
  })
}

// The form's required "Yes, delete" tick keeps a stray tap from removing a page.
export async function deletePage(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ pages, store }) => {
    await pages.remove(store.id, String(form.get('id')))
    return '/admin/pages'
  })
}

/** Standard pages arrive in the language the owner is using the admin in. */
export async function addStandardPages() {
  return act('settings.manage', ({ pages, store, locale }) => pages.addTemplates(store.id, locale))
}
