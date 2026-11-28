'use server'

import { act, type ActionState } from '../act'

export async function setFeature(_: ActionState, form: FormData) {
  const id = String(form.get('id'))
  const on = form.get('op') === 'on'
  return act('settings.manage', ({ features, store }) => features.setEnabled(store.id, id, on))
}
