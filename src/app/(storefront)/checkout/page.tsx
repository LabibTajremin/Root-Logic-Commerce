import { TrustStrip } from '../trust-strip'
import type { Metadata } from 'next'
import { storefront } from '../storefront'
import { TrackOnView } from '../ga'
import { CheckoutForm } from './checkout-form'
import { checkoutProps } from './checkout-props'

export const metadata: Metadata = { robots: { index: false } }

export default async function CheckoutPage() {
  const [{ business, t }, props] = await Promise.all([storefront(), checkoutProps()])
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <TrackOnView name="begin_checkout" params={{ currency: 'BDT' }} />
      <h1 className="font-heading text-3xl">{t('checkout.title')}</h1>
      <CheckoutForm {...props} />
      <TrustStrip trust={business.trust} t={t} place="checkout" />
    </section>
  )
}
