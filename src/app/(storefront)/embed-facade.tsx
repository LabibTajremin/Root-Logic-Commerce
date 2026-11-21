'use client'

import { useState } from 'react'
import type { Embed } from '@/modules/promotions'
import { Icon } from '@/ui/icon'

/** Shows a still + play button; the provider's player (and its scripts) load only on tap. */
export const EmbedFacade = ({
  embed,
  label,
  title,
}: {
  embed: Embed
  label: string
  title: string
}) => {
  const [on, setOn] = useState(false)
  if (on)
    return (
      <iframe
        src={embed.src}
        title={title}
        allow="autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-card border-0"
      />
    )
  return (
    <button
      type="button"
      onClick={() => setOn(true)}
      aria-label={`${label}: ${title}`}
      className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-card bg-text text-bg"
    >
      {embed.thumb && (
        <span
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${embed.thumb})` }}
        />
      )}
      <span className="relative inline-flex size-16 items-center justify-center rounded-full bg-button text-button-text">
        <Icon name="play" size={28} />
      </span>
    </button>
  )
}
