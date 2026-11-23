import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductBadges, StockLeft } from '@/ui/product-badges'
import { GaEvent } from '../../ga'
import { breadcrumbLd, faqLd, JsonLd } from '../../json-ld'
import { AddToCart, OrderNow } from '../../cart-buttons'
import { origin } from '../../origin'
import { storefront } from '../../storefront'
import { ProductTabs } from './product-tabs'

type Props = { params: Promise<{ slug: string }> }

const product = async (slug: string) => {
  const { catalog, store } = await storefront()
  return (await catalog.getActiveProduct(store.id, slug)) ?? notFound()
}

export const generateMetadata = async ({ params }: Props): Promise<Metadata> => {
  const p = await product((await params).slug)
  return {
    title: p.seoTitle ?? p.name,
    description: p.seoDescription ?? p.description.slice(0, 160),
  }
}

export default async function ProductPage({ params }: Props) {
  const p = await product((await params).slug)
  const { theme, view, imagesOf, t, allCategories } = await storefront()
  const { ProductGallery } = theme.slots
  const images = (await imagesOf([p])).get(p.id)!
  const v = view(p, images)
  const base = await origin()
  const item = { id: p.id, slug: p.slug, name: p.name, price: p.price }
  const cat = allCategories.find((c) => c.id === p.categoryId)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.sku ?? undefined,
    category: cat?.name,
    image: images.map((i) => `${base}${i.src}/1024`),
    offers: {
      '@type': 'Offer',
      priceCurrency: 'BDT',
      price: (p.price / 100).toFixed(2),
      availability: `https://schema.org/${v.inStock ? 'InStock' : 'OutOfStock'}`,
    },
  }
  return (
    <article className="mx-auto grid max-w-6xl gap-8 px-4 py-8 md:grid-cols-2">
      <JsonLd data={jsonLd} />
      <JsonLd
        data={breadcrumbLd(base, [
          { name: t('nav.home'), path: '/' },
          ...(cat ? [{ name: cat.name, path: `/c/${cat.slug}` }] : []),
          { name: p.name, path: `/p/${p.slug}` },
        ])}
      />
      {p.content.faq.length > 0 && <JsonLd data={faqLd(p.content.faq)} />}
      <GaEvent
        name="view_item"
        params={{
          currency: 'BDT',
          value: p.price / 100,
          items: [{ item_id: p.id, item_name: p.name, price: p.price / 100 }],
        }}
      />
      <ProductGallery name={p.name} images={images} />
      <div className="flex flex-col gap-4">
        <ProductBadges badges={v.badges} className="flex-row" />
        <h1 className="font-heading text-3xl md:text-4xl">{p.name}</h1>
        <p className="flex items-baseline gap-3 text-2xl font-semibold">
          {v.price}
          {v.compareAt && <s className="text-base font-normal text-muted">{v.compareAt}</s>}
        </p>
        <p className="text-sm font-semibold">{v.inStock ? t('shop.inStock') : t('shop.soldOut')}</p>
        <StockLeft n={v.left} label={t('shop.left')} />
        {v.inStock && (
          <div className="flex flex-col gap-2 sm:max-w-sm">
            <AddToCart item={item} label={t('shop.addToCart')} />
            <OrderNow item={item} label={t('shop.orderNow')} />
          </div>
        )}
        <p className="rounded-card bg-soft p-4 text-sm">{t('shop.cod')}</p>
        <ProductTabs description={p.description} content={p.content} t={t} />
      </div>
    </article>
  )
}
