import type { Metadata } from 'next'
import { storefront } from '../storefront'
import { GaEvent } from '../ga'
import { CheckoutForm } from './checkout-form'

export const metadata: Metadata = { robots: { index: false } }

const KEYS = [
  'details',
  'address',
  'payment',
  'name',
  'phone',
  'email',
  'district',
  'area',
  'addressLine',
  'note',
  'zone',
  'place',
  'summary',
  'total',
  'empty',
  'guest',
  'otpTitle',
  'otpSent',
  'otpCode',
  'verify',
]

export default async function CheckoutPage() {
  const { business, t } = await storefront()
  const labels = {
    ...Object.fromEntries(KEYS.map((k) => [k, t(`checkout.${k}`)])),
    subtotal: t('shop.subtotal'),
    cod: t('shop.cod'),
    continue: t('shop.continue'),
  }
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <GaEvent name="begin_checkout" params={{ currency: 'BDT' }} />
      <h1 className="font-heading text-3xl">{t('checkout.title')}</h1>
      <CheckoutForm
        zones={business.deliveryZones}
        labels={labels}
        banglaDigits={business.banglaDigits}
      />
    </section>
  )
}
