'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Icon } from '@/ui/icon'

type Labels = { region: string; prev: string; next: string; slide: string }

/**
 * B3: server-rendered slides; this only tracks which is active. CSS does the motion
 * (slide = translate, fade = opacity). Autoplay pauses on hover/focus and never runs
 * for visitors who prefer reduced motion.
 */
export const HeroSlider = ({
  slides,
  interval,
  effect,
  labels,
}: {
  slides: ReactNode[]
  interval: number
  effect: 'slide' | 'fade'
  labels: Labels
}) => {
  const n = slides.length
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const go = (i: number) => setActive((i + n) % n)
  useEffect(() => {
    if (paused || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setActive((a) => (a + 1) % n), interval * 1000)
    return () => clearInterval(timer)
  }, [paused, interval, n])
  return (
    <section
      aria-roledescription="carousel"
      aria-label={labels.region}
      data-effect={effect}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="rlc-slider relative mx-auto w-full max-w-6xl overflow-hidden px-4"
    >
      <div className="relative aspect-[4/5] overflow-hidden rounded-card md:aspect-[3/1]">
        {slides.map((s, i) => (
          <div
            key={i}
            role="group"
            aria-roledescription="slide"
            aria-label={labels.slide.replace('{{i}}', String(i + 1)).replace('{{n}}', String(n))}
            aria-hidden={i !== active}
            inert={i !== active}
            style={{ '--offset': i - active } as CSSProperties}
            className="rlc-slide absolute inset-0"
          >
            {s}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => go(active - 1)}
          aria-label={labels.prev}
          className="inline-flex size-11 items-center justify-center"
        >
          <Icon name="chevronLeft" />
        </button>
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => go(i)}
            aria-label={labels.slide.replace('{{i}}', String(i + 1)).replace('{{n}}', String(n))}
            aria-current={i === active ? 'true' : undefined}
            className="group inline-flex size-11 items-center justify-center"
          >
            <span className="size-2.5 rounded-full bg-line group-aria-[current]:bg-accent" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => go(active + 1)}
          aria-label={labels.next}
          className="inline-flex size-11 items-center justify-center"
        >
          <Icon name="chevronRight" />
        </button>
      </div>
    </section>
  )
}
