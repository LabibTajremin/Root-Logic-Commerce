import type { CSSProperties } from 'react'
import type { Design } from '@/modules/site-settings'
import { AnnouncementClose } from './announcement-close'
import { rotateKeyframes } from './announcement-motion'

/**
 * B1: rotating or scrolling messages above the header. Pure CSS motion; visitors who
 * prefer reduced motion see the first message, still (globals.css).
 */
export const AnnouncementBar = ({
  a,
  label,
  close,
}: {
  a: Design['announcement']
  label: string
  close: string
}) => {
  const n = a.messages.length
  const body = (
    <div
      data-mode={a.mode}
      className="rlc-announce relative h-9 flex-1 overflow-hidden text-center text-sm font-semibold"
      style={{ '--n': n, '--rotate': `rlc-rotate-${n}` } as CSSProperties}
    >
      {a.messages.map((m, i) => (
        <p
          key={i}
          style={{ '--i': i } as CSSProperties}
          className="absolute inset-0 content-center truncate px-10"
        >
          {m}
        </p>
      ))}
    </div>
  )
  return (
    <aside aria-label={label} className="flex items-center bg-button text-button-text">
      <style>{rotateKeyframes(n)}</style>
      {a.link ? (
        <a href={a.link} className="flex flex-1">
          {body}
        </a>
      ) : (
        body
      )}
      {a.closable && <AnnouncementClose label={close} />}
    </aside>
  )
}
