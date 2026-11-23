'use client'

import { useRef, useState } from 'react'
import type { ImageView } from '@/themes/_contract'
import { Icon } from './icon'
import { ProductImage } from './product-image'

export type GalleryLabels = { photos: string; prev: string; next: string; photo: string }

/**
 * A12: swipe (CSS scroll-snap), arrows and thumbnails for 2+ photos. Fit, thumbnail
 * position and hover zoom come from CSS on the product page wrapper.
 */
export const Gallery = ({ images, labels }: { images: ImageView[]; labels: GalleryLabels }) => {
  const track = useRef<HTMLUListElement>(null)
  const [at, setAt] = useState(0)
  const go = (i: number) => {
    const el = track.current!
    el.scrollTo({ left: i * el.clientWidth })
  }
  const arrow =
    'absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-surface/90 shadow disabled:opacity-0'
  return (
    <div className="rlc-gallery flex flex-col gap-3">
      <div className="relative">
        <ul
          ref={track}
          aria-label={labels.photos}
          onScroll={(e) =>
            setAt(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))
          }
          className="flex snap-x snap-mandatory overflow-x-auto rounded-card [scrollbar-width:none]"
        >
          {images.map((img, i) => (
            <li
              key={img.src}
              className="rlc-zoom relative aspect-square w-full shrink-0 snap-center overflow-hidden bg-soft"
            >
              <ProductImage image={img} sizes="(min-width: 768px) 50vw, 100vw" priority={i === 0} />
            </li>
          ))}
        </ul>
        <button
          type="button"
          aria-label={labels.prev}
          disabled={at === 0}
          onClick={() => go(at - 1)}
          className={`${arrow} left-2`}
        >
          <Icon name="chevronLeft" size={20} />
        </button>
        <button
          type="button"
          aria-label={labels.next}
          disabled={at === images.length - 1}
          onClick={() => go(at + 1)}
          className={`${arrow} right-2`}
        >
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
      <ul className="rlc-thumbs grid grid-cols-5 gap-2">
        {images.map((img, i) => (
          <li key={img.src}>
            <button
              type="button"
              aria-label={labels.photo.replace('{{n}}', String(i + 1))}
              aria-current={i === at ? 'true' : undefined}
              onClick={() => go(i)}
              className="relative block aspect-square w-full overflow-hidden rounded-control border-2 border-transparent aria-[current]:border-[var(--color-button)]"
            >
              <ProductImage image={img} sizes="96px" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
