'use client'

import { useActionState } from 'react'
import { importProducts, type ImportState } from './actions'

type Labels = Record<
  'file' | 'check' | 'apply' | 'line' | 'action' | 'problems' | 'ready' | 'fix' | 'done',
  string
> & { actions: Record<string, string>; errors: Record<string, string> }

/** A15: check the sheet first (nothing is saved), then apply it. */
export const ImportForm = ({ labels: L }: { labels: Labels }) => {
  const [state, run, pending] = useActionState<ImportState, FormData>(importProducts, {})
  const btn = 'min-h-11 rounded-control px-4 font-semibold disabled:opacity-60'
  return (
    <form action={run} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-semibold" htmlFor="csv">
        {L.file}
        <input
          id="csv"
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="font-normal"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          name="apply"
          value="0"
          disabled={pending}
          className={`${btn} border border-line bg-surface`}
        >
          {L.check}
        </button>
        <button
          name="apply"
          value="1"
          disabled={pending}
          className={`${btn} bg-button text-button-text`}
        >
          {L.apply}
        </button>
      </div>
      {state.error && <p role="alert">{state.error}</p>}
      {state.rows && (
        <div role="status" className="flex flex-col gap-2">
          <p className="font-semibold">{state.applied ? L.done : state.ok ? L.ready : L.fix}</p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">{L.line}</th>
                <th className="p-2">{L.action}</th>
                <th className="p-2">{L.problems}</th>
              </tr>
            </thead>
            <tbody>
              {state.rows.map((r) => (
                <tr key={r.line} className="border-t border-line">
                  <td className="p-2">{r.line}</td>
                  <td className="p-2">{r.action ? L.actions[r.action] : '—'}</td>
                  <td className="p-2 text-danger">{r.errors.map((e) => L.errors[e]).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </form>
  )
}
