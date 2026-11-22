import Link from 'next/link'
import type { BannerData } from '@/modules/promotions'
import { ProductImage } from '@/ui/product-image'

type PosterData = Extract<BannerData, { kind: 'poster' }>

export const Cta = ({ href, label }: { href: string; label: string }) =>
  label && (
    <Link
      href={href || '/'}
      className="inline-flex min-h-11 w-fit items-center rounded-control bg-button px-5 font-semibold text-button-text"
    >
      {label}
    </Link>
  )

/** A poster banner: headline card over a colour or photo. Used in the banner list and the hero slider. */
export const Poster = ({ d, priority = false }: { d: PosterData; priority?: boolean }) => (
  <div
    className="relative h-full overflow-hidden rounded-card px-6 py-12 text-white md:px-12 md:py-20"
    style={{ backgroundColor: d.background }}
  >
    {d.imageId && (
      <ProductImage
        image={{ src: `/api/media/${d.imageId}`, color: d.background }}
        sizes="100vw"
        priority={priority}
      />
    )}
    <div className="relative flex max-w-xl flex-col gap-3 rounded-card bg-black/55 p-5">
      <p className="font-heading text-3xl md:text-5xl">{d.headline}</p>
      <p>{d.sub}</p>
      <Cta href={d.href} label={d.cta} />
    </div>
  </div>
)
