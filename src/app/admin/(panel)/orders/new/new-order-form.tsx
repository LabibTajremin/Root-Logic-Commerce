'use client'

import { useState, type ReactNode } from 'react'
import { ActionForm } from '@/ui/action-form'
import { createManualOrder, findCustomer } from './actions'

type Option = { value: string; label: string }
const input = 'min-h-11 rounded-control border border-line bg-surface px-3'

const Labelled = ({ id, label, children }: { id: string; label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5 text-sm font-semibold">
    <label htmlFor={id}>{label}</label>
    {children}
  </div>
)

/** C12: an order the shop takes by phone, chat or at the counter. */
export const NewOrderForm = ({
  products,
  zones,
  sources,
  labels: L,
}: {
  products: Option[]
  zones: Option[]
  sources: Option[]
  labels: Record<string, string>
}) => {
  // A shop with no active products gets an empty list instead of a crash.
  const first = (n: number) => products.slice(0, 1).map((p) => ({ n, key: p.value, qty: 1 }))
  const [lines, setLines] = useState(() => first(0))
  const [found, setFound] = useState('')
  const items = lines.map((l) => {
    const [productId, variantId] = l.key.split(':')
    return { productId, variantId: variantId || null, quantity: l.qty }
  })
  const set = (n: number, patch: Partial<(typeof lines)[number]>) =>
    setLines(lines.map((l) => (l.n === n ? { ...l, ...patch } : l)))
  const lookup = async (form: HTMLFormElement) => {
    const phone = (form.elements.namedItem('phone') as HTMLInputElement).value
    const c = await findCustomer(phone)
    setFound(c ? L.found! : L.notFound!)
    for (const [k, v] of Object.entries(c ?? {}))
      (form.elements.namedItem(k) as HTMLInputElement).value = v
  }
  return (
    <ActionForm action={createManualOrder} className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <Labelled id="phone" label={L.phone!}>
            <input id="phone" name="phone" type="tel" required className={input} />
          </Labelled>
        </div>
        <button
          type="button"
          onClick={(e) => void lookup(e.currentTarget.form!)}
          className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold"
        >
          {L.find}
        </button>
      </div>
      <p role="status" className="text-sm text-muted">
        {found}
      </p>
      {(['name', 'district', 'area', 'address'] as const).map((k) => (
        <Labelled key={k} id={k} label={L[k]!}>
          <input id={k} name={k} required className={input} />
        </Labelled>
      ))}
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">{L.items}</legend>
        {lines.map((l, i) => (
          <div key={l.n} className="flex flex-wrap items-end gap-2">
            <div className="min-w-48 flex-1">
              <Labelled id={`p${l.n}`} label={`${L.product} ${i + 1}`}>
                <select
                  id={`p${l.n}`}
                  value={l.key}
                  onChange={(e) => set(l.n, { key: e.target.value })}
                  className={input}
                >
                  {products.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </Labelled>
            </div>
            <Labelled id={`q${l.n}`} label={`${L.qty} ${i + 1}`}>
              <input
                id={`q${l.n}`}
                type="number"
                min={1}
                max={99}
                value={l.qty}
                onChange={(e) => set(l.n, { qty: Number(e.target.value) })}
                className={`${input} w-24`}
              />
            </Labelled>
            <button
              type="button"
              disabled={lines.length === 1}
              onClick={() => setLines(lines.filter((x) => x.n !== l.n))}
              className="min-h-11 px-2 text-sm text-danger underline disabled:opacity-40"
            >
              {L.remove}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setLines([...lines, ...first(Math.max(0, ...lines.map((l) => l.n)) + 1)])}
          className="min-h-11 w-fit rounded-control border border-line px-4 text-sm font-semibold"
        >
          {L.addLine}
        </button>
        <input type="hidden" name="items" value={JSON.stringify(items)} />
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-3">
        <Labelled id="zoneId" label={L.zone!}>
          <select id="zoneId" name="zoneId" className={input}>
            {zones.map((z) => (
              <option key={z.value} value={z.value}>
                {z.label}
              </option>
            ))}
          </select>
        </Labelled>
        <Labelled id="discount" label={L.discount!}>
          <input
            id="discount"
            name="discount"
            type="number"
            min={0}
            defaultValue={0}
            className={input}
          />
        </Labelled>
        <Labelled id="source" label={L.source!}>
          <select id="source" name="source" defaultValue="manual" className={input}>
            {sources.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Labelled>
      </div>
      <Labelled id="note" label={L.note!}>
        <input id="note" name="note" className={input} />
      </Labelled>
      <button className="min-h-12 rounded-control bg-button px-4 font-semibold text-button-text">
        {L.create}
      </button>
    </ActionForm>
  )
}
