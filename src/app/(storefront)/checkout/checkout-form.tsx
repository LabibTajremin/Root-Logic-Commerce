'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { formatMoney } from '@/modules/shared'
import { cart, useCart } from '../cart-store'
import { placeOrder } from './actions'

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

export const CheckoutForm = ({
  zones,
  labels: L,
  banglaDigits,
}: {
  zones: Zone[]
  labels: Record<string, string>
  banglaDigits: boolean
}) => {
  const items = useCart()
  const router = useRouter()
  const [zoneId, setZoneId] = useState(zones[0]!.id)
  const [error, setError] = useState('')
  const [otpTo, setOtpTo] = useState('')
  const [pending, start] = useTransition()
  const money = (m: number) => formatMoney(m, { banglaDigits })
  const subtotal = items.reduce((s, l) => s + l.price * l.qty, 0)
  const charge = zones.find((z) => z.id === zoneId)!.charge

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
          <Input id="email" label={L.email} type="email" autoComplete="email" />
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
            <li key={l.id} className="flex justify-between gap-2">
              <span>
                {l.name} × {l.qty}
              </span>
              <span>{money(l.price * l.qty)}</span>
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
        <p className="flex justify-between text-lg font-semibold">
          <span>{L.total}</span>
          <span data-testid="checkout-total">{money(subtotal + charge)}</span>
        </p>
        <input
          type="hidden"
          name="items"
          value={JSON.stringify(items.map((l) => ({ productId: l.id, quantity: l.qty })))}
        />
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
        <button
          disabled={pending}
          className="inline-flex min-h-12 items-center justify-center rounded-control bg-button px-4 font-semibold text-button-text disabled:opacity-60"
        >
          {otpTo ? L.verify : L.place}
        </button>
        <p className="text-xs text-muted">{L.guest}</p>
      </aside>
    </form>
  )
}
