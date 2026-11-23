'use server'

import type { ReviewStatus } from '@/modules/reviews'
import { act, type ActionState } from '../act'

// id/status/reply are inputs of the review forms, so `get` never returns null.
export async function moderateReview(_: ActionState, form: FormData) {
  return act('products.manage', async ({ reviews, store }) => {
    const status = String(form.get('status')) as ReviewStatus
    await reviews.moderate(store.id, String(form.get('id')), status)
  })
}

export async function replyReview(_: ActionState, form: FormData) {
  return act('products.manage', ({ reviews, store }) =>
    reviews.reply(store.id, String(form.get('id')), String(form.get('reply'))),
  )
}
