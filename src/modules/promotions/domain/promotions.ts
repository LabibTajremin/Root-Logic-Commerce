import { z } from 'zod'

export type Embed =
  | { provider: 'youtube'; id: string; src: string; thumb: string }
  | { provider: 'facebook' | 'instagram'; src: string; thumb: null }

const YT = /^[\w-]{11}$/

/** Turns a pasted share link into a privacy-friendly embed URL (loaded only on tap). */
export const parseEmbed = (input: string): Embed | null => {
  let u: URL
  try {
    u = new URL(input.trim())
  } catch {
    return null
  }
  const host = u.hostname.replace(/^(www|m)\./, '')
  if (host === 'youtu.be' || host === 'youtube.com') {
    const id =
      host === 'youtu.be'
        ? u.pathname.slice(1)
        : (u.searchParams.get('v') ??
          /^\/(shorts|embed|live)\/([\w-]+)/.exec(u.pathname)?.[2] ??
          '')
    if (!YT.test(id)) return null
    return {
      provider: 'youtube',
      id,
      src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`,
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    }
  }
  if ((host === 'facebook.com' || host === 'fb.watch') && u.pathname.length > 1)
    return {
      provider: 'facebook',
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(u.href)}&autoplay=1`,
      thumb: null,
    }
  const ig = /^\/(p|reel|tv)\/([\w-]+)/.exec(u.pathname)
  if (host === 'instagram.com' && ig)
    return {
      provider: 'instagram',
      src: `https://www.instagram.com/${ig[1]}/${ig[2]}/embed`,
      thumb: null,
    }
  return null
}

const text = (max: number) => z.string().trim().max(max)
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/)
const href = z
  .string()
  .regex(/^\/[^\s]*$/, 'link.local')
  .or(z.url().startsWith('https://'))
  .or(z.literal(''))

export const bannerData = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('products'),
    productIds: z.array(z.uuid()).min(1).max(10),
    message: text(120),
    cta: text(30),
  }),
  z.object({
    kind: z.literal('images'),
    mediaIds: z.array(z.uuid()).min(1).max(10),
    message: text(120),
    cta: text(30),
    href,
  }),
  z.object({
    kind: z.literal('poster'),
    background: hex,
    imageId: z.uuid().nullable(),
    headline: text(80).min(1),
    sub: text(160),
    cta: text(30),
    href,
  }),
  z.object({ kind: z.literal('video'), mediaId: z.uuid(), caption: text(120) }),
  z.object({
    kind: z.literal('embed'),
    url: z.url().refine((u) => parseEmbed(u) !== null, 'embed.unsupported'),
    caption: text(120),
  }),
])
export type BannerData = z.infer<typeof bannerData>
export type BannerKind = BannerData['kind']
