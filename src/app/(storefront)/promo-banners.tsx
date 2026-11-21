import Link from 'next/link'
import { parseEmbed, type Banner } from '@/modules/promotions'
import { ProductImage } from '@/ui/product-image'
import { EmbedFacade } from './embed-facade'
import { storefront } from './storefront'

const PLACEHOLDER = '#E5E7EB'
const Cta = ({ href, label }: { href: string; label: string }) =>
  label && (
    <Link
      href={href || '/'}
      className="inline-flex min-h-11 w-fit items-center rounded-control bg-button px-5 font-semibold text-button-text"
    >
      {label}
    </Link>
  )

/** Owner's active banners at the top of the home page, in their chosen order. */
export const PromoBanners = async () => {
  const { store, promotions, catalog, imagesOf, t } = await storefront()
  const banners = await promotions.active(store.id)
  const ids = banners.flatMap((b) => (b.data.kind === 'products' ? b.data.productIds : []))
  const products = (await catalog.listProducts(store.id, { status: 'active' })).filter((p) =>
    ids.includes(p.id),
  )
  const images = await imagesOf(products)
  const one = (b: Banner) => {
    const d = b.data
    switch (d.kind) {
      case 'products':
        return (
          <div className="flex flex-col gap-3">
            <p className="font-heading text-2xl">{d.message}</p>
            <ul className="flex snap-x gap-3 overflow-x-auto" aria-label={d.message}>
              {products
                .filter((p) => d.productIds.includes(p.id))
                .map((p) => (
                  <li key={p.id} className="w-40 shrink-0 snap-start">
                    <Link href={`/p/${p.slug}`} className="flex flex-col gap-2">
                      <span className="relative aspect-square overflow-hidden rounded-card bg-soft">
                        {images.get(p.id)![0] && (
                          <ProductImage image={images.get(p.id)![0]!} sizes="160px" />
                        )}
                      </span>
                      <span className="text-sm font-semibold">{p.name}</span>
                      <span className="text-sm text-muted">{d.cta}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )
      case 'images':
        return (
          <div className="flex flex-col gap-3">
            <ul
              // Focusable so keyboard users can scroll the slideshow.
              tabIndex={0}
              className="flex snap-x snap-mandatory overflow-x-auto rounded-card outline-accent"
              aria-label={t('promotions.title')}
            >
              {d.mediaIds.map((id) => (
                <li
                  key={id}
                  className="relative aspect-[4/5] w-full shrink-0 snap-start md:aspect-[3/1]"
                >
                  <ProductImage
                    image={{ src: `/api/media/${id}`, color: PLACEHOLDER }}
                    sizes="100vw"
                  />
                </li>
              ))}
            </ul>
            <p className="font-heading text-2xl">{d.message}</p>
            <Cta href={d.href} label={d.cta} />
          </div>
        )
      case 'poster':
        return (
          <div
            className="relative overflow-hidden rounded-card px-6 py-12 text-white md:px-12 md:py-20"
            style={{ backgroundColor: d.background }}
          >
            {d.imageId && (
              <ProductImage
                image={{ src: `/api/media/${d.imageId}`, color: d.background }}
                sizes="100vw"
              />
            )}
            <div className="relative flex max-w-xl flex-col gap-3 rounded-card bg-black/55 p-5">
              <p className="font-heading text-3xl md:text-5xl">{d.headline}</p>
              <p>{d.sub}</p>
              <Cta href={d.href} label={d.cta} />
            </div>
          </div>
        )
      case 'video':
        return (
          <figure className="flex flex-col gap-2">
            <video
              controls
              playsInline
              preload="metadata"
              src={`/api/media/${d.mediaId}/0`}
              className="w-full rounded-card bg-text"
            />
            <figcaption className="text-sm text-muted">{d.caption}</figcaption>
          </figure>
        )
      case 'embed': {
        const e = parseEmbed(d.url)!
        return (
          <figure className="flex flex-col gap-2">
            <EmbedFacade
              embed={e}
              label={t('promotions.play')}
              title={d.caption || t('promotions.watchOn', { provider: e.provider })}
            />
            <figcaption className="text-sm text-muted">{d.caption}</figcaption>
          </figure>
        )
      }
    }
  }
  return (
    banners.length > 0 && (
      <section
        aria-label={t('promotions.title')}
        className="mx-auto flex max-w-6xl flex-col gap-6 px-4 pt-6"
      >
        {banners.map((b) => (
          <div key={b.id}>{one(b)}</div>
        ))}
      </section>
    )
  )
}
