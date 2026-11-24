import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ProductBadges, StockLeft } from '@/ui/product-badges'
import { GaEvent } from '../../ga'
import { Breadcrumbs } from '../../breadcrumbs'
import { faqLd, JsonLd } from '../../json-ld'
import { orderButtons, stickyBuyBar } from '@/modules/site-settings'
import { QtyBuy, StickyBuy } from './buy-buttons'
import { origin } from '../../origin'
import { storefront } from '../../storefront'
import { ProductGrid } from '../../product-grid'
import { BoughtTogether } from './bought-together'
import { ProductTabs } from './product-tabs'
import { Share } from './share'
import { WishButton } from './wish-button'
import { ScreenshotStrip } from '../../screenshot-strip'
import { TrustStrip } from '../../trust-strip'
import { SizeChartButton } from './size-chart'
import { VariantPicker } from './variant-picker'
import { variantLabel } from '@/modules/catalog'

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
  const {
    theme,
    view,
    imagesOf,
    t,
    allCategories,
    catalog,
    store,
    moneyFormat,
    design,
    reviews,
    on,
    business,
  } = await storefront()
  const { ProductGallery } = theme.slots
  const images = (await imagesOf([p])).get(p.id)!
  const v = view(p, images)
  const base = await origin()
  const item = {
    id: p.id,
    productId: p.id,
    variantId: null,
    slug: p.slug,
    name: p.name,
    price: p.price,
  }
  // B2: the owner's ways to order (WhatsApp / Call only with the shop's numbers).
  const paths = {
    ids: orderButtons(business),
    whatsapp: business.contact.whatsapp.replace(/\D/g, ''),
    phone: business.contact.phone,
    url: `${base}/p/${p.slug}`,
    labels: {
      addToCart: t('shop.addToCart'),
      orderNow: t('shop.orderNow'),
      whatsapp: t('shop.waOrder'),
      call: t('shop.callOrder'),
      waText: t('shop.waOrderText'),
    },
  }

  const chart = await catalog.sizeChartFor(store.id, p)
  const { reviews: said, summary } = await reviews.forProduct(store.id, p.id)
  const shots = await reviews.screenshots(store.id)
  const recs = await catalog.recommendationsFor(store.id, p)
  const asItem = (x: typeof p) => ({
    id: x.id,
    productId: x.id,
    variantId: null,
    slug: x.slug,
    name: x.name,
    price: x.price,
  })
  const variants = (await catalog.listVariants(store.id, [p.id])).map((x) => {
    const shown = view({ ...p, price: x.price, compareAtPrice: x.compareAtPrice }, images)
    const label = variantLabel(p.options, x.options)
    return {
      options: x.options,
      price: shown.price,
      compareAt: shown.compareAt,
      stock: x.stock,
      item: { ...item, id: x.id, variantId: x.id, name: `${p.name} (${label})`, price: x.price },
    }
  })
  const cat = allCategories.find((c) => c.id === p.categoryId)
  const brand = (await catalog.listBrands(store.id)).find((b) => b.id === p.brandId && !b.archived)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    sku: p.sku ?? undefined,
    category: cat?.name,
    brand: brand && { '@type': 'Brand', name: brand.name },
    image: images.map((i) => `${base}${i.src}/1024`),
    // A7: only real, approved reviews — never a made-up rating.
    aggregateRating: summary
      ? { '@type': 'AggregateRating', ratingValue: summary.average, reviewCount: summary.count }
      : undefined,
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
      <div className="md:col-span-2">
        <Breadcrumbs
          base={base}
          label={t('list.breadcrumb')}
          items={[
            { name: t('nav.home'), path: '/' },
            ...(cat ? [{ name: cat.name, path: `/c/${cat.slug}` }] : []),
            { name: p.name, path: `/p/${p.slug}` },
          ]}
        />
      </div>
      {p.content.faq.length > 0 && <JsonLd data={faqLd(p.content.faq)} />}
      <GaEvent
        name="view_item"
        params={{
          currency: 'BDT',
          value: p.price / 100,
          items: [{ item_id: p.id, item_name: p.name, price: p.price / 100 }],
        }}
      />
      <div data-fit={design.gallery.fit} data-thumbs={design.gallery.thumbs}>
        <ProductGallery
          name={p.name}
          images={images}
          labels={{
            photos: t('shop.photos'),
            prev: t('shop.prevPhoto'),
            next: t('shop.nextPhoto'),
            photo: t('shop.photo'),
          }}
        />
      </div>
      <div className="flex flex-col gap-4">
        <ProductBadges badges={v.badges} className="flex-row" />
        <h1 className="font-heading text-3xl md:text-4xl">{p.name}</h1>
        {summary && (
          <a href="#reviews" className="text-sm font-semibold" data-testid="rating">
            <span aria-hidden>★</span>{' '}
            {t('reviews.summary', { avg: summary.average, n: summary.count })}
          </a>
        )}
        {brand && (
          <a href={`/b/${brand.slug}`} className="text-sm font-semibold text-muted underline">
            {t('shop.brand')}: {brand.name}
          </a>
        )}
        {variants.length > 0 ? (
          <VariantPicker
            paths={paths}
            options={p.options}
            variants={variants}
            labels={{
              inStock: t('shop.inStock'),
              soldOut: t('shop.soldOut'),
              addToCart: t('shop.addToCart'),
              orderNow: t('shop.orderNow'),
              addToList: t('shop.addToList'),
              selected: t('shop.selected'),
              total: t('shop.selectedTotal'),
              addAll: t('shop.addAll'),
              remove: t('shop.remove'),
            }}
            moneyFormat={moneyFormat}
          />
        ) : (
          <>
            <p className="flex items-baseline gap-3 text-2xl font-semibold">
              {v.price}
              {v.compareAt && <s className="text-base font-normal text-muted">{v.compareAt}</s>}
            </p>
            <p className="text-sm font-semibold">
              {v.inStock ? t('shop.inStock') : t('shop.soldOut')}
            </p>
            <StockLeft n={v.left} label={t('shop.left')} />
            {v.inStock && (
              <QtyBuy item={item} max={p.stock} qtyLabel={t('shop.qty')} paths={paths} />
            )}
          </>
        )}
        {chart && (
          <SizeChartButton
            chart={chart}
            labels={{ open: t('shop.sizeChart'), close: t('common.close') }}
          />
        )}
        <p className="rounded-card bg-soft p-4 text-sm">{t('shop.cod')}</p>
        <TrustStrip trust={business.trust} t={t} />
        {stickyBuyBar(business, { variants: variants.length, inStock: v.inStock }) && (
          <StickyBuy
            item={item}
            price={v.price}
            labels={{ cart: t('shop.cart'), orderNow: t('shop.orderNow') }}
          />
        )}
        {on('wishlist') && (
          <WishButton item={item} labels={{ add: t('wishlist.add'), saved: t('wishlist.saved') }} />
        )}
        <Share
          url={`${base}/p/${p.slug}`}
          labels={{
            share: t('shop.share'),
            facebook: t('shop.shareFacebook'),
            whatsapp: t('shop.shareWhatsapp'),
            messenger: t('shop.shareMessenger'),
            copy: t('shop.copyLink'),
            copied: t('shop.copied'),
          }}
        />
        <ProductTabs description={p.description} content={p.content} t={t} />
      </div>
      {recs.together.length > 0 && (
        <div className="md:col-span-2">
          <BoughtTogether
            me={asItem(p)}
            others={recs.together.map(asItem)}
            labels={{
              title: t('shop.together'),
              total: t('shop.togetherTotal'),
              add: t('shop.addSelected'),
              thisItem: t('shop.thisItem'),
            }}
            moneyFormat={moneyFormat}
          />
        </div>
      )}
      {recs.related.length > 0 && (
        <section aria-labelledby="related" className="flex flex-col gap-4 md:col-span-2">
          <h2 id="related" className="font-heading text-2xl">
            {t('shop.related')}
          </h2>
          <ProductGrid products={recs.related} />
        </section>
      )}
      {said.length > 0 && (
        <section
          id="reviews"
          aria-labelledby="reviews-title"
          className="flex flex-col gap-3 md:col-span-2"
        >
          <h2 id="reviews-title" className="font-heading text-2xl">
            {t('reviews.title')}
          </h2>
          <ul className="flex flex-col gap-3">
            {said.map((r) => (
              <li key={r.id} className="rounded-card border border-line p-4">
                <p className="font-semibold">
                  <span aria-label={t('reviews.stars', { n: r.rating })}>
                    {'★'.repeat(r.rating)}
                    <span className="text-muted">{'★'.repeat(5 - r.rating)}</span>
                  </span>{' '}
                  {r.name}
                </p>
                <p className="whitespace-pre-line text-muted">{r.body}</p>
                {r.reply && (
                  <p className="mt-2 rounded-control bg-soft p-3 text-sm">
                    <span className="font-semibold">{t('reviews.reply')}:</span> {r.reply}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="md:col-span-2">
        <ScreenshotStrip shots={shots} labels={{ title: t('shots.shop'), alt: t('shots.alt') }} />
      </div>
    </article>
  )
}
