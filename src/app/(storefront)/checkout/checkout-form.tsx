'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { freeShipping, type FreeShippingRule } from '@/modules/orders'
import { formatMoney, type MoneyFormat } from '@/modules/shared'
import { cart, useCart } from '../cart-store'
import { placeOrder, quoteOrder, type Quote } from './actions'

type Zone = { id: string; label: string; charge: number }

const Input = ({
  id,
  label,
  ...rest
}: { id: string; label?: string } & ComponentProps<'input'>) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-semibold">
      {label}
    </label>
    <input
      id={id}
      name={id}
      className="min-h-11 rounded-control border border-line bg-surface px-3"
      {...rest}
    />
  </div>
)

const Section = ({ title, children }: { title?: string; children: ReactNode }) => (
  <fieldset className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
    <legend className="px-1 font-heading text-lg">{title}</legend>
    {children}
  </fieldset>
)

type Fields = {
  email: 'off' | 'optional' | 'required'
  altPhone: boolean
  preferredTime: boolean
  giftWrap: boolean
}

export const CheckoutForm = ({
  zones,
  labels: L,
  moneyFormat,
  fields,
  coupons,
  freeRule,
}: {
  zones: Zone[]
  labels: Record<string, string>
  moneyFormat: MoneyFormat
  /** C6: the extra fields this shop asks for. */
  fields: Fields
  /** C2: show the "Have a code?" box (the coupons module is on). */
  coupons: boolean
  freeRule: FreeShippingRule
}) => {
  const items = useCart()
  const router = useRouter()
  const [zoneId, setZoneId] = useState(zones[0]!.id)
  const [error, setError] = useState('')
  const [otpTo, setOtpTo] = useState('')
  const [pending, start] = useTransition()
  // C18: removing a line asks once more (the button turns into "Tap again to remove").
  const [removing, setRemoving] = useState('')
  const money = (m: number) => formatMoney(m, moneyFormat)
  const subtotal = items.reduce((s, l) => s + l.price * l.qty, 0)
  // C3: same rule the server applies when placing.
  const charge = freeShipping(freeRule, {
    subtotal,
    zoneId,
    productIds: items.map((l) => l.productId),
  }).free
    ? 0
    : zones.find((z) => z.id === zoneId)!.charge
  const payload = JSON.stringify(
    items.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.qty })),
  )
  // A quote is only shown for the cart and zone it was made for; placing re-prices anyway.
  const [quote, setQuote] = useState<{ for: string; q: Quote } | null>(null)
  const shown = quote?.for === payload + zoneId ? quote.q : null
  const discount = shown && 'discount' in shown ? shown.discount : 0
  const applyCode = (form: HTMLFormElement) =>
    start(async () => setQuote({ for: payload + zoneId, q: await quoteOrder(new FormData(form)) }))

  if (items.length === 0)
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted">{L.empty}</p>
        <Link href="/" className="font-semibold underline">
          {L.continue}
        </Link>
      </div>
    )

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    start(async () => {
      const r = await placeOrder(form)
      if ('error' in r) return setError(r.error)
      if ('otp' in r) return (setError(''), setOtpTo(r.otp))
      router.push(`/order/${r.orderNo}`)
      cart.clear()
    })
  }

  return (
    <form onSubmit={submit} aria-busy={pending} className="grid gap-6 md:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <Section title={L.details}>
          <Input
            id="name"
            label={L.name}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
          <Input
            id="phone"
            label={L.phone}
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
          />
          {fields.email !== 'off' && (
            <Input
              id="email"
              label={fields.email === 'required' ? L.emailRequired : L.email}
              type="email"
              autoComplete="email"
              required={fields.email === 'required'}
            />
          )}
          {fields.altPhone && (
            <Input
              id="altPhone"
              label={L.altPhone}
              type="tel"
              inputMode="tel"
              placeholder="01XXXXXXXXX"
            />
          )}
        </Section>
        <Section title={L.address}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input id="district" label={L.district} required minLength={2} />
            <Input id="area" label={L.area} required minLength={2} />
          </div>
          <Input
            id="address"
            label={L.addressLine}
            required
            minLength={5}
            autoComplete="street-address"
          />
          <Input id="note" label={L.note} maxLength={500} />
          {fields.preferredTime && (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="preferredTime" className="text-sm font-semibold">
                {L.preferredTime}
              </label>
              <select
                id="preferredTime"
                name="preferredTime"
                className="min-h-11 rounded-control border border-line bg-surface px-3"
              >
                {(['any', 'morning', 'afternoon', 'evening'] as const).map((p) => (
                  <option key={p} value={p}>
                    {L[`time_${p}`]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {fields.giftWrap && (
            <label className="flex min-h-11 items-center gap-3 text-sm font-semibold">
              <input type="checkbox" name="giftWrap" className="size-5" />
              {L.giftWrap}
            </label>
          )}
        </Section>
        <Section title={L.zone}>
          {zones.map((z) => (
            <label
              key={z.id}
              className="flex min-h-11 items-center gap-3 rounded-control border border-line px-3"
            >
              <input
                type="radio"
                name="zoneId"
                value={z.id}
                checked={z.id === zoneId}
                onChange={() => setZoneId(z.id)}
              />
              <span className="flex-1">{z.label}</span>
              <span className="font-semibold">{money(z.charge)}</span>
            </label>
          ))}
        </Section>
        <Section title={L.payment}>
          <p className="text-sm">{L.cod}</p>
        </Section>
      </div>
      <aside className="flex h-fit flex-col gap-3 rounded-card border border-line bg-surface p-5">
        <h2 className="font-heading text-lg">{L.summary}</h2>
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((l) => (
            <li key={l.id} className="flex flex-col gap-1 border-b border-line pb-2">
              <span className="flex justify-between gap-2">
                <span>{l.name}</span>
                <span>{money(l.price * l.qty)}</span>
              </span>
              {/* C18: change the order without leaving checkout. */}
              <span
                role="group"
                aria-label={`${L.qty}: ${l.name}`}
                className="flex items-center gap-1"
              >
                <button
                  type="button"
                  aria-label="−"
                  onClick={() => cart.setQty(l.id, l.qty - 1)}
                  className="size-9 rounded-control border border-line"
                >
                  −
                </button>
                <output className="w-6 text-center">{l.qty}</output>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => cart.setQty(l.id, l.qty + 1)}
                  className="size-9 rounded-control border border-line"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => (removing === l.id ? cart.remove(l.id) : setRemoving(l.id))}
                  className="ms-auto min-h-9 px-2 text-danger underline"
                >
                  {removing === l.id ? L.removeSure : L.remove}
                </button>
              </span>
            </li>
          ))}
        </ul>
        <p className="flex justify-between border-t border-line pt-3 text-sm">
          <span>{L.subtotal}</span>
          <span>{money(subtotal)}</span>
        </p>
        <p className="flex justify-between text-sm">
          <span>{L.zone}</span>
          <span>{money(charge)}</span>
        </p>
        {discount > 0 && (
          <p className="flex justify-between text-sm text-success" data-testid="checkout-discount">
            <span>
              {L.discount} ({(shown as { couponCode: string }).couponCode})
            </span>
            <span>−{money(discount)}</span>
          </p>
        )}
        <p className="flex justify-between text-lg font-semibold">
          <span>{L.total}</span>
          <span data-testid="checkout-total">{money(subtotal + charge - discount)}</span>
        </p>
        <input type="hidden" name="items" value={payload} />
        {coupons && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="couponCode" className="text-sm font-semibold">
              {L.haveCode}
            </label>
            <div className="flex gap-2">
              <input
                id="couponCode"
                name="couponCode"
                autoComplete="off"
                className="min-h-11 min-w-0 flex-1 rounded-control border border-line bg-surface px-3 uppercase"
              />
              <button
                type="button"
                onClick={(e) => applyCode(e.currentTarget.form!)}
                className="min-h-11 rounded-control border border-line px-3 text-sm font-semibold"
              >
                {L.applyCode}
              </button>
            </div>
            {shown && 'error' in shown && (
              <p role="alert" className="text-sm text-danger">
                {shown.error}
              </p>
            )}
          </div>
        )}
        {otpTo && (
          <div className="flex flex-col gap-2 rounded-control bg-soft p-3">
            <p className="font-semibold">{L.otpTitle}</p>
            <p className="text-sm">{L.otpSent!.replace('{{to}}', otpTo)}</p>
            <Input
              id="code"
              label={L.otpCode}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
            />
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-control bg-danger/10 p-3 text-sm text-danger">
            {error}
          </p>
        )}
        {/* C19: one big button; disabled while placing, so a double tap can't order twice. */}
        <button
          disabled={pending}
          className="inline-flex min-h-14 items-center justify-center rounded-control bg-button px-4 text-lg font-semibold text-button-text disabled:opacity-60"
        >
          {pending ? L.placing : otpTo ? L.verify : L.place}
        </button>
        <ul className="flex flex-col gap-1 text-xs text-muted">
          {[L.trustCod, L.trustCheck, L.trustReturn].map((x) => (
            <li key={x}>✓ {x}</li>
          ))}
        </ul>
        <p className="text-xs text-muted">{L.guest}</p>
      </aside>
    </form>
  )
}
