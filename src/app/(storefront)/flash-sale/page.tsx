import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Countdown } from '../countdown'
import { ProductGrid } from '../product-grid'
import { storefront } from '../storefront'

export const generateMetadata = async (): Promise<Metadata> => ({
  title: (await storefront()).t('flash.title'),
})

/** B11: the running sale's products, with the time left. */
export default async function FlashSalePage() {
  const { sale, catalog, store, t } = await storefront()
  if (!sale) notFound()
  const listed = new Set(sale.items.map((i) => i.productId))
  const products = (await catalog.listProducts(store.id, { status: 'active' })).filter((p) =>
    listed.has(p.id),
  )
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="font-heading text-3xl">{sale.name}</h1>
      <Countdown
        endsAt={sale.endsAt.toISOString()}
        labels={{ left: t('flash.endsIn'), ended: t('flash.ended') }}
      />
      {sale.cap !== null && <p className="text-muted">{t('flash.cap', { n: sale.cap })}</p>}
      <ProductGrid products={products} />
    </section>
  )
}
