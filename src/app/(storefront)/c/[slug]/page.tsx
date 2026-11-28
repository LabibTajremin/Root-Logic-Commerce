import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Breadcrumbs } from '../../breadcrumbs'
import { origin } from '../../origin'
import { ProductListing } from '../../product-listing'
import { storefront } from '../../storefront'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const category = async (slug: string) =>
  (await storefront()).allCategories.find((c) => c.slug === slug) ?? notFound()

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const c = await category((await params).slug)
  return { title: c.seoTitle ?? c.name, description: c.seoDescription }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const c = await category((await params).slug)
  const { theme, store, categories, catalog, t } = await storefront()
  const { CategoryNav } = theme.slots
  const products = await catalog.listProducts(store.id, { status: 'active', categoryId: c.id })
  return (
    <section className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <Breadcrumbs
        base={await origin()}
        label={t('list.breadcrumb')}
        items={[
          { name: t('nav.home'), path: '/' },
          { name: c.name, path: `/c/${c.slug}` },
        ]}
      />
      <h1 className="font-heading text-3xl md:text-4xl">{c.name}</h1>
      <CategoryNav categories={categories} active={c.slug} allLabel={t('shop.all')} />
      <ProductListing
        products={products}
        path={`/c/${c.slug}`}
        params={await searchParams}
        extra={{}}
      />
    </section>
  )
}
