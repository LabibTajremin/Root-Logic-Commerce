'use server'

import type { BlockKind } from '@/modules/fraud'
import { act, type ActionState } from '../act'

// kind/value/note/id are inputs of the block forms.
export async function addBlock(_: ActionState, form: FormData) {
  return act('orders.manage', ({ fraud, store }) =>
    fraud.block(store.id, {
      kind: String(form.get('kind')) as BlockKind,
      value: String(form.get('value')),
      note: String(form.get('note') ?? ''),
    }),
  )
}

export async function removeBlock(_: ActionState, form: FormData) {
  return act('orders.manage', ({ fraud, store }) => fraud.unblock(store.id, String(form.get('id'))))
}
