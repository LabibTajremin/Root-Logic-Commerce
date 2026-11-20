import { describe, expect, it } from 'vitest'
import { bannerData, parseEmbed } from './promotions'

const ID = 'dQw4w9WgXcQ'
const UUID = '00000000-0000-4000-8000-000000000001'

describe('embeds', () => {
  it('parses every YouTube link form into a no-cookie embed with a thumbnail', () => {
    for (const url of [
      `https://www.youtube.com/watch?v=${ID}&t=10`,
      `https://youtu.be/${ID}`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://youtube.com/embed/${ID}`,
      `https://www.youtube.com/live/${ID}`,
    ])
      expect(parseEmbed(url)).toEqual({
        provider: 'youtube',
        id: ID,
        src: `https://www.youtube-nocookie.com/embed/${ID}?autoplay=1`,
        thumb: `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`,
      })
    expect(parseEmbed('https://www.youtube.com/watch?v=short')).toBeNull()
    expect(parseEmbed('https://www.youtube.com/channel/UCx')).toBeNull()
  })

  it('parses Facebook and Instagram video links', () => {
    expect(parseEmbed('https://www.facebook.com/shop/videos/123456/')).toMatchObject({
      provider: 'facebook',
      src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent('https://www.facebook.com/shop/videos/123456/')}&autoplay=1`,
    })
    expect(parseEmbed('https://fb.watch/abc123/')).toMatchObject({ provider: 'facebook' })
    expect(parseEmbed('https://www.facebook.com/')).toBeNull()
    expect(parseEmbed('https://www.instagram.com/reel/Cx1Yz/?igsh=1')).toEqual({
      provider: 'instagram',
      src: 'https://www.instagram.com/reel/Cx1Yz/embed',
      thumb: null,
    })
    expect(parseEmbed('https://www.instagram.com/shop/')).toBeNull()
    expect(parseEmbed('https://vimeo.com/1')).toBeNull()
    expect(parseEmbed('not a url')).toBeNull()
  })
})

describe('banner data', () => {
  it('accepts each kind and rejects bad links and unsupported embeds', () => {
    const ok = (d: unknown) => bannerData.safeParse(d).success
    expect(ok({ kind: 'products', productIds: [UUID], message: 'Eid sale', cta: 'Shop' })).toBe(
      true,
    )
    expect(ok({ kind: 'images', mediaIds: [UUID], message: '', cta: '', href: '/c/tea' })).toBe(
      true,
    )
    expect(
      ok({ kind: 'images', mediaIds: [UUID], message: '', cta: '', href: 'javascript:alert(1)' }),
    ).toBe(false)
    expect(
      ok({
        kind: 'poster',
        background: '#3C6430',
        imageId: null,
        headline: 'Hi',
        sub: '',
        cta: 'Go',
        href: 'https://x.test/a',
      }),
    ).toBe(true)
    expect(
      ok({
        kind: 'poster',
        background: 'red',
        imageId: null,
        headline: 'Hi',
        sub: '',
        cta: '',
        href: '',
      }),
    ).toBe(false)
    expect(ok({ kind: 'video', mediaId: UUID, caption: '' })).toBe(true)
    expect(ok({ kind: 'embed', url: `https://youtu.be/${ID}`, caption: '' })).toBe(true)
    expect(ok({ kind: 'embed', url: 'https://vimeo.com/1', caption: '' })).toBe(false)
    expect(ok({ kind: 'products', productIds: [], message: '', cta: '' })).toBe(false)
  })
})
