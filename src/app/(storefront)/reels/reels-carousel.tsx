'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Icon } from '@/ui/icon'
import { OrderNow } from '../cart-buttons'
import type { Item } from '../cart-store'

export type ReelView = {
  id: string
  caption: string
  /** Owner's cover, else the platform's thumbnail; uploads without one show their first frame. */
  cover: string | null
  video: string | null
  embed: string | null
  products: { item: Item; price: string }[]
}

type Labels = {
  play: string
  reel: string
  prev: string
  next: string
  close: string
  order: string
}

/**
 * B4: cover-flow as designed in Figma — the centre card large, neighbours turned inward and
 * faded (CSS perspective by distance from centre, see globals.css); scroll-snap does the rest.
 */
export const ReelsCarousel = ({ reels, labels }: { reels: ReelView[]; labels: Labels }) => {
  const track = useRef<HTMLUListElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState<ReelView | null>(null)
  const go = (i: number) =>
    (track.current!.children[i] as HTMLElement).scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  // The card nearest the track's middle is the centre one.
  const onScroll = () => {
    const t = track.current!
    const middle = t.scrollLeft + t.clientWidth / 2
    const cards = [...t.children] as HTMLElement[]
    const dist = cards.map((c) => Math.abs(c.offsetLeft + c.offsetWidth / 2 - middle))
    setActive(dist.indexOf(Math.min(...dist)))
  }
  useEffect(() => {
    if (open) dialog.current!.showModal()
  }, [open])
  return (
    <div className="flex flex-col items-center gap-4">
      <ul
        ref={track}
        onScroll={onScroll}
        className="rlc-reel-track flex w-full snap-x snap-mandatory gap-4 overflow-x-auto px-[calc(50%-110px)] py-6"
      >
        {reels.map((r, i) => (
          <li
            key={r.id}
            data-offset={Math.max(-3, Math.min(3, i - active))}
            className="rlc-reel w-[220px] shrink-0 snap-center"
          >
            <button
              type="button"
              onClick={() => setOpen(r)}
              className="relative block aspect-[9/16] w-full overflow-hidden rounded-[28px] bg-text shadow-xl ring-1 ring-white/20"
            >
              {r.cover ? (
                <span
                  aria-hidden
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${r.cover})` } as CSSProperties}
                />
              ) : (
                <video
                  src={r.video!}
                  muted
                  playsInline
                  preload="metadata"
                  className="absolute inset-0 size-full object-cover"
                />
              )}
              <span className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/75 to-transparent p-4 pt-16 text-left text-white">
                {/* The name is what the card shows, with "Play reel:" for screen readers. */}
                <span className="font-heading text-lg leading-tight">
                  <span className="sr-only">{labels.play}: </span>
                  {r.caption || <span className="sr-only">{labels.reel}</span>}
                </span>
                {r.products[0] && (
                  <span className="text-sm font-semibold">{r.products[0].price}</span>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 rounded-full border border-line bg-surface px-2 py-1.5 shadow">
        <button
          type="button"
          aria-label={labels.prev}
          onClick={() => go(Math.max(0, active - 1))}
          className="inline-flex size-11 items-center justify-center rounded-full"
        >
          <Icon name="chevronLeft" size={20} />
        </button>
        {reels.map((r, i) => (
          <button
            key={r.id}
            type="button"
            aria-label={`${labels.reel} ${i + 1}`}
            aria-current={i === active}
            onClick={() => go(i)}
            className="h-2 w-2 rounded-full bg-line aria-[current=true]:w-6 aria-[current=true]:bg-accent"
          />
        ))}
        <button
          type="button"
          aria-label={labels.next}
          onClick={() => go(Math.min(reels.length - 1, active + 1))}
          className="inline-flex size-11 items-center justify-center rounded-full"
        >
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
      {open && (
        <dialog
          ref={dialog}
          onClose={() => setOpen(null)}
          aria-label={open.caption || labels.reel}
          className="m-auto w-full max-w-sm rounded-[28px] bg-surface p-0 text-text backdrop:bg-black/80"
        >
          {open.video ? (
            <video
              src={open.video}
              autoPlay
              muted
              playsInline
              controls
              loop
              className="aspect-[9/16] w-full bg-black"
            />
          ) : (
            <iframe
              src={open.embed!}
              title={open.caption || labels.reel}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="aspect-[9/16] w-full border-0 bg-black"
            />
          )}
          <div className="flex flex-col gap-3 p-4">
            {open.caption && <p className="font-semibold">{open.caption}</p>}
            {open.products.map(({ item, price }) => (
              <div key={item.id} className="flex items-center gap-3">
                <span className="flex-1 text-sm">
                  {item.name} · <strong>{price}</strong>
                </span>
                <span className="w-32">
                  <OrderNow item={item} qty={1} label={labels.order} />
                </span>
              </div>
            ))}
            <form method="dialog">
              <button className="min-h-11 w-full rounded-control border border-line font-semibold">
                {labels.close}
              </button>
            </form>
          </div>
        </dialog>
      )}
    </div>
  )
}
