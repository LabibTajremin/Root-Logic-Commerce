import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { breadcrumbLd, JsonLd } from '../../json-ld'
import { origin } from '../../origin'
import { ProductGrid } from '../../product-grid'
import { storefront } from '../../storefront'

type Props = { params: Promise<{ slug: string }> }

const brand = async (slug: string) => {
  const { catalog, store } = await storefront()
  return (await catalog.getBrandBySlug(store.id, slug)) ?? notFound()
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => ({
  title: (await brand((await params).slug)).name,
})

/** A2: every active product of one brand. */
export default async function BrandPage({ params }: Props) {
  const b = await brand((await params).slug)
  const { store, catalog, t } = await storefront()
  const products = await catalog.listProducts(store.id, { status: 'active', brandId: b.id })
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <JsonLd
        data={breadcrumbLd(await origin(), [
          { name: t('nav.home'), path: '/' },
          { name: b.name, path: `/b/${b.slug}` },
        ])}
      />
      <div className="flex items-center gap-4">
        {b.logoId && (
          <span className="relative size-16 overflow-hidden rounded-card bg-soft">
            <Image
              src={`/api/media/${b.logoId}`}
              alt=""
              fill
              sizes="64px"
              className="object-contain"
            />
          </span>
        )}
        <h1 className="font-heading text-3xl md:text-4xl">{b.name}</h1>
      </div>
      <ProductGrid products={products} />
    </section>
  )
}
