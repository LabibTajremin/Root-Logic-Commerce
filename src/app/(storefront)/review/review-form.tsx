'use client'

import { useActionState } from 'react'
import { ActionForm } from '@/ui/action-form'
import { findReviewable, submitReview, type Reviewable } from './actions'

type Labels = Record<
  | 'orderNo'
  | 'phone'
  | 'find'
  | 'notFound'
  | 'limited'
  | 'rating'
  | 'body'
  | 'name'
  | 'send'
  | 'thanks'
  | 'star',
  string
>
const box = 'min-h-11 rounded-control border border-line bg-surface px-3'

/** A7: prove the delivered order (number + phone), then rate each item in it. */
export const ReviewForm = ({ labels }: { labels: Labels }) => {
  const [state, find, pending] = useActionState<Reviewable, FormData>(findReviewable, {})
  return (
    <div className="flex flex-col gap-6">
      <form action={find} className="flex flex-col gap-3 sm:max-w-sm">
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="no">
          {labels.orderNo}
          <input
            id="no"
            name="no"
            inputMode="numeric"
            required
            defaultValue={state.no}
            className={`${box} font-normal`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="phone">
          {labels.phone}
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={state.phone}
            className={`${box} font-normal`}
          />
        </label>
        <button
          disabled={pending}
          className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text"
        >
          {labels.find}
        </button>
        {state.notFound && <p role="alert">{labels.notFound}</p>}
        {state.limited && <p role="alert">{labels.limited}</p>}
      </form>
      {state.items?.map((item) => (
        <ActionForm
          key={item.id}
          action={submitReview}
          saved={labels.thanks}
          className="flex flex-col gap-3 rounded-card border border-line p-4"
        >
          <h2 className="font-heading text-xl">{item.name}</h2>
          <input type="hidden" name="no" value={state.no} />
          <input type="hidden" name="phone" value={state.phone} />
          <input type="hidden" name="productId" value={item.id} />
          <fieldset className="flex flex-col gap-1">
            <legend className="text-sm font-semibold">{labels.rating}</legend>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <label key={n} className="flex min-h-11 items-center gap-1 text-sm">
                  <input type="radio" name="rating" value={n} required defaultChecked={n === 5} />
                  {labels.star.replace('{{n}}', String(n))}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`body-${item.id}`}>
            {labels.body}
            <textarea
              id={`body-${item.id}`}
              name="body"
              rows={3}
              maxLength={1000}
              className="rounded-control border border-line bg-surface p-3 font-normal"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor={`name-${item.id}`}>
            {labels.name}
            <input
              id={`name-${item.id}`}
              name="name"
              required
              maxLength={60}
              className={`${box} font-normal`}
            />
          </label>
          <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
            {labels.send}
          </button>
        </ActionForm>
      ))}
    </div>
  )
}
