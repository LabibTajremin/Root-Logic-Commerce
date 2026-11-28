import Image from 'next/image'
import type { Screenshot } from '@/modules/reviews'

/** A7 "What customers say": owner-uploaded chat screenshots, scrolled sideways. */
export const ScreenshotStrip = ({
  shots,
  labels,
}: {
  shots: Screenshot[]
  labels: { title: string; alt: string }
}) => (
  // Hidden by CSS while there are no screenshots.
  <section aria-labelledby="shots-title" className="flex flex-col gap-3 has-[ul:empty]:hidden">
    <h2 id="shots-title" className="font-heading text-2xl">
      {labels.title}
    </h2>
    {/* Focusable so keyboard users can scroll the strip. */}
    <ul
      tabIndex={0}
      aria-labelledby="shots-title"
      className="flex snap-x gap-3 overflow-x-auto pb-2 outline-offset-2"
    >
      {shots.map((s) => (
        <li key={s.id} className="w-40 shrink-0 snap-start">
          <figure className="flex flex-col gap-1">
            <span className="relative aspect-[9/16] overflow-hidden rounded-card bg-soft">
              <Image
                src={`/api/media/${s.mediaId}`}
                alt={labels.alt}
                fill
                sizes="160px"
                className="object-cover"
              />
            </span>
            <figcaption className="text-xs text-muted">{s.caption}</figcaption>
          </figure>
        </li>
      ))}
    </ul>
  </section>
)
