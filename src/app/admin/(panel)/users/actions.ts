'use server'

import { act, type ActionState } from '../act'

export async function inviteUser(_: ActionState, form: FormData) {
  return act('users.manage', ({ access, store, actor }) =>
    access.inviteUser(actor, store.id, {
      name: form.get('name'),
      email: form.get('email'),
      password: form.get('password'),
      role: form.get('role'),
    }),
  )
}

export async function setRole(_: ActionState, form: FormData) {
  return act('users.manage', ({ access, store, actor }) =>
    access.setRole(
      actor,
      store.id,
      String(form.get('userId')),
      form.get('role') === 'OWNER' ? 'OWNER' : 'STAFF',
    ),
  )
}
