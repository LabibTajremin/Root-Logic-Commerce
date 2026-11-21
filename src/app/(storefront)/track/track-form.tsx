'use client'

import { useActionState } from 'react'
import { trackOrder, type TrackState } from './actions'

export const TrackForm = ({
  labels: L,
  initialNo,
}: {
  labels: Record<string, string>
  initialNo: string
}) => {
  const [state, run, pending] = useActionState(trackOrder, {} as TrackState)
  return (
    <div className="flex flex-col gap-6">
      <form
        action={run}
        aria-busy={pending}
        className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="no" className="text-sm font-semibold">
            {L.orderNo}
          </label>
          <input
            id="no"
            name="no"
            required
            inputMode="numeric"
            pattern="[0-9]+"
            defaultValue={initialNo}
            className="min-h-11 rounded-control border border-line bg-bg px-3"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-semibold">
            {L.phone}
          </label>
          <input
            id="phone"
            name="phone"
            required
            type="tel"
            autoComplete="tel"
            className="min-h-11 rounded-control border border-line bg-bg px-3"
          />
        </div>
        <button
          disabled={pending}
          className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text"
        >
          {L.submit}
        </button>
      </form>
      {state.limited && (
        <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm text-danger">
          {L.limited}
        </p>
      )}
      {state.notFound && (
        <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm text-danger">
          {L.notFound}
        </p>
      )}
      {state.order && (
        <section
          aria-label={`#${state.order.orderNo}`}
          className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5"
        >
          <p className="flex items-center justify-between">
            <span className="font-heading text-xl">#{state.order.orderNo}</span>
            <span
              data-testid="track-status"
              className="rounded-full bg-soft px-3 py-1 text-sm font-semibold"
            >
              {state.order.status}
            </span>
          </p>
          <p className="text-sm text-muted">{state.order.placed}</p>
          <ul className="flex flex-col gap-1 text-sm">
            {state.order.items.map((i) => (
              <li key={i.name} className="flex justify-between">
                <span>
                  {i.name} × {i.qty}
                </span>
                <span>{i.total}</span>
              </li>
            ))}
          </ul>
          <p className="flex justify-between border-t border-line pt-2 font-semibold">
            <span>{L.total}</span>
            <span>{state.order.total}</span>
          </p>
        </section>
      )}
    </div>
  )
}
