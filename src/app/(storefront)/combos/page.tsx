import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { storefront } from '../storefront'
import { ComboList } from './combo-list'

export const generateMetadata = async (): Promise<Metadata> => ({
  title: (await storefront()).t('combos.title'),
})

/** A9: every combo the shop offers. */
export default async function CombosPage() {
  const ctx = await storefront()
  if (!ctx.on('combos')) notFound()
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="font-heading text-3xl">{ctx.t('combos.title')}</h1>
      <ComboList ctx={ctx} />
    </section>
  )
}
