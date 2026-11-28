'use client'

import { useActionState } from 'react'
import { subscribeNewsletter } from './newsletter-actions'

export type NewsletterLabels = { contact: string; consent: string; join: string; thanks: string }

/** B13: one field (mobile or email) and the consent tick. */
export const NewsletterForm = ({ labels }: { labels: NewsletterLabels }) => {
  const [state, run, pending] = useActionState(subscribeNewsletter, {})
  if (state.ok)
    return (
      <p role="status" className="font-semibold text-success">
        {labels.thanks}
      </p>
    )
  return (
    <form action={run} aria-busy={pending} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {labels.contact}
        <input
          name="contact"
          required
          autoComplete="email"
          className="min-h-11 rounded-control border border-line bg-surface px-3 font-normal"
        />
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required className="mt-0.5 size-5" />
        {labels.consent}
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      )}
      <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
        {labels.join}
      </button>
    </form>
  )
}
