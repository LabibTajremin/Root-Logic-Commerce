import { z } from 'zod'
import { DomainError } from '@/modules/shared'
import { parseEmbed } from './promotions'

/** B4: a reel is an uploaded video or a Facebook/Instagram/TikTok/YouTube link. */
export const reelInput = z.object({
  videoId: z.uuid().nullable().default(null),
  url: z.string().trim().max(500).nullable().default(null),
  coverId: z.uuid().nullable().default(null),
  caption: z.string().trim().max(120).default(''),
  productIds: z.array(z.uuid()).max(4).default([]),
})
export type ReelInput = z.input<typeof reelInput>
export type ReelData = z.output<typeof reelInput>

/**
 * One source only; a link must be one we can play, and links without a public thumbnail
 * (Facebook, Instagram, TikTok — theirs need a Meta/TikTok token) need the owner's cover.
 */
export const checkReel = (r: ReelData) => {
  if (!r.videoId === !r.url) throw new DomainError('reel.source')
  if (!r.url) return
  const embed = parseEmbed(r.url)
  if (!embed) throw new DomainError('reel.link')
  if (!embed.thumb && !r.coverId) throw new DomainError('reel.cover')
}
