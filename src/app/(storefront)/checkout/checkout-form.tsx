'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition, type ComponentProps, type FormEvent, type ReactNode } from 'react'
import { normalizeBdPhone } from '@/modules/customers'
import {
  bdDistricts,
  detectZone,
  freeShipping,
  type AddressRule,
  type FreeShippingRule,
} from '@/modules/orders/client'
import { formatMoney, type MoneyFormat } from '@/modules/shared'
import { cart, useCart, type CartLine } from '../cart-store'
import { placeOrder, quoteOrder, saveDraft, type Quote } from './actions'

// C1: this browser's own copy of what was typed (the shop's copy is the server draft).
const KEPT = 'rlc-checkout'
let typed: ReturnType<typeof setTimeout> | undefined
/** Ref callback: the form mounts once the cart is known, then gets the kept fields back. */
const restore = (form: HTMLFormElement) => {
  const raw = localStorage.getItem(KEPT)
  if (raw) {
    const fields = [...form.querySelectorAll<HTMLInputElement>('[data-kept]')]
    // A field the shop switched on since keeps its own (empty) value.
    const kept = {
      ...Object.fromEntries(fields.map((el) => [el.name, el.value])),
      ...JSON.parse(raw),
    }
    for (const el of fields) el.value = kept[el.name]
    form.querySelector<HTMLElement>('[data-restored]')!.hidden = false
  }
  // Leaving checkout drops a draft save still waiting to go.
  return () => clearTimeout(typed)
}

type Zone = { id: string; label: string; charge: number }

const Input = ({
  id,
  label,
  hint,
  ...rest
}: { id: string; label?: string; hint?: string } & ComponentProps<'input'>) => (
  <div className="flex flex-col gap-1.5">
    <label htmlFor={id} className="text-sm font-semibold">
      {label}
    </label>
    <input
      id={id}
      name={id}
      className="min-h-11 rounded-control border border-line bg-surface px-3"
      aria-describedby={hint && `${id}-hint`}
      {...rest}
    />
    {hint && (
      <p id={`${id}-hint`} className="text-xs text-muted">
        {hint}
      </p>
    )}
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
  address,
  landing,
}: {
  zones: Zone[]
  labels: Record<string, string>
  moneyFormat: MoneyFormat
  /** C6: the extra fields this shop asks for. */
  fields: Fields
  /** C2: show the "Have a code?" box (the coupons module is on). */
  coupons: boolean
  freeRule: FreeShippingRule
  /** C4/C17: district suggestions and the zone each district means. */
  address: AddressRule
  /** H5: a landing page's own order — one product, the pack's quantity and saving; the cart is left alone. */
  landing?: { id: string; line: CartLine; saving: number; setQty: (qty: number) => void }
}) => {
  const cartItems = useCart()
  const items = landing ? [landing.line] : cartItems
  const setQty = landing ? (_: string, qty: number) => landing.setQty(qty) : cart.setQty
  const router = useRouter()
  const [zoneId, setZoneId] = useState(zones[0]!.id)
  const [error, setError] = useState('')
  const [otpTo, setOtpTo] = useState('')
  const [pending, start] = useTransition()
  // C18: removing a line asks once more (the button turns into "Tap again to remove").
  const [removing, setRemoving] = useState('')
  // C5: the device's position, asked for only when the shopper taps the button.
  const [loc, setLoc] = useState<{ lat: number; lng: number; accuracy: number } | null>(null)
  const [locFailed, setLocFailed] = useState(false)
  const locate = () =>
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => (
        setLocFailed(false),
        setLoc({
          lat: coords.latitude,
          lng: coords.longitude,
          accuracy: Math.round(coords.accuracy),
        })
      ),
      () => setLocFailed(true),
      { enableHighAccuracy: true, timeout: 15_000 },
    )
  // C17: the zone the typed address points to (shown as a chip; the shopper can still change it).
  const [detected, setDetected] = useState<string | null>(null)
  const onType = (e: FormEvent<HTMLFormElement>) => {
    const form = e.currentTarget
    const data = new FormData(form)
    // Only address typing re-guesses, so a zone the shopper picked stays picked.
    if (['district', 'area', 'address'].includes((e.target as HTMLInputElement).name)) {
      const z = detectZone(
        ['district', 'area', 'address'].map((k) => data.get(k)).join(' '),
        address,
        zones.map((z) => z.id),
      )
      setDetected(z)
      if (z) setZoneId(z)
    }
    const now = Object.fromEntries(
      [...form.querySelectorAll<HTMLInputElement>('[data-kept]')].map((el) => [el.name, el.value]),
    )
    localStorage.setItem(KEPT, JSON.stringify(now))
    clearTimeout(typed)
    // The shop only gets a draft once the phone is a real BD number.
    if (!normalizeBdPhone(now.phone!)) return
    typed = setTimeout(() => void saveDraft(data), 800)
  }
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
  const discount = landing ? landing.saving : shown && 'discount' in shown ? shown.discount : 0
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
    // A pending draft save must not land after the order (it would leave a stale draft).
    clearTimeout(typed)
    start(async () => {
      const r = await placeOrder(form)
      if ('error' in r) return setError(r.error)
      if ('otp' in r) return (setError(''), setOtpTo(r.otp))
      localStorage.removeItem(KEPT)
      router.push(`/order/${r.orderNo}`)
      if (!landing) cart.clear()
    })
  }

  return (
    <form
      ref={restore}
      onSubmit={submit}
      onInput={onType}
      aria-busy={pending}
      className="grid gap-6 md:grid-cols-[1fr_360px]"
    >
      <div className="flex flex-col gap-6">
        <p
          role="status"
          data-restored
          hidden
          className="rounded-control bg-soft p-3 text-sm font-semibold"
        >
          {L.draftRestored}
        </p>
        <Section title={L.details}>
          <Input
            id="name"
            data-kept
            label={L.name}
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
          <Input
            id="phone"
            data-kept
            label={L.phone}
            hint={L.phoneHint}
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="01XXXXXXXXX"
          />
          {fields.email !== 'off' && (
            <Input
              id="email"
              data-kept
              label={fields.email === 'required' ? L.emailRequired : L.email}
              type="email"
              autoComplete="email"
              required={fields.email === 'required'}
            />
          )}
          {fields.altPhone && (
            <Input
              id="altPhone"
              data-kept
              label={L.altPhone}
              type="tel"
              inputMode="tel"
              placeholder="01XXXXXXXXX"
            />
          )}
        </Section>
        <Section title={L.address}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              id="district"
              data-kept
              label={L.district}
              required
              minLength={2}
              list={address.mode === 'picker' ? 'bd-districts' : undefined}
            />
            <Input id="area" data-kept label={L.area} required minLength={2} />
          </div>
          <p className="text-xs text-muted">{L.thanaHint}</p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={locate}
              className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold"
            >
              {L.shareLocation}
            </button>
            <input type="hidden" name="location" value={JSON.stringify(loc)} />
            <p role="status" className="text-sm" data-testid="location">
              {loc
                ? L.locationAdded!.replace('{{m}}', String(loc.accuracy))
                : locFailed && L.locationFailed}
            </p>
          </div>
          {address.mode === 'picker' && (
            <datalist id="bd-districts">
              {bdDistricts
                .flatMap((d) => [d.en, d.bn])
                .map((n) => (
                  <option key={n} value={n} />
                ))}
            </datalist>
          )}
          <Input
            id="address"
            data-kept
            label={L.addressLine}
            required
            minLength={5}
            autoComplete="street-address"
          />
          <Input id="note" data-kept label={L.note} maxLength={500} />
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
          {detected && (
            <p
              data-testid="zone-detected"
              className="w-fit rounded-full bg-soft px-3 py-1 text-sm font-semibold"
            >
              {L.zoneDetected!.replace('{{zone}}', zones.find((z) => z.id === detected)!.label)}
            </p>
          )}
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
                  onClick={() => setQty(l.id, l.qty - 1)}
                  className="size-9 rounded-control border border-line"
                >
                  −
                </button>
                <output className="w-6 text-center">{l.qty}</output>
                <button
                  type="button"
                  aria-label="+"
                  onClick={() => setQty(l.id, l.qty + 1)}
                  className="size-9 rounded-control border border-line"
                >
                  +
                </button>
                {!landing && (
                  <button
                    type="button"
                    onClick={() => (removing === l.id ? cart.remove(l.id) : setRemoving(l.id))}
                    className="ms-auto min-h-9 px-2 text-danger underline"
                  >
                    {removing === l.id ? L.removeSure : L.remove}
                  </button>
                )}
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
              {landing
                ? L.packSaving
                : `${L.discount} (${(shown as { couponCode: string }).couponCode})`}
            </span>
            <span>−{money(discount)}</span>
          </p>
        )}
        <p className="flex justify-between text-lg font-semibold">
          <span>{L.total}</span>
          <span data-testid="checkout-total">{money(subtotal + charge - discount)}</span>
        </p>
        <input type="hidden" name="items" value={payload} />
        {landing && <input type="hidden" name="landingId" value={landing.id} />}
        {coupons && !landing && (
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
        <p className="text-xs text-muted">{L.draftConsent}</p>
      </aside>
    </form>
  )
}
