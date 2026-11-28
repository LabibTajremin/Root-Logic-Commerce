import { describe, expect, it } from 'vitest'
import {
  conversion,
  copySlug,
  defaultBlocks,
  landingInput,
  landingSettings,
  moveBlock,
  packPrice,
  splitRow,
} from './landing'

const product = {
  name: 'Rose Attar',
  description: 'Long lasting.',
  price: 1000,
  compareAtPrice: null,
}

describe('landing pages (H5)', () => {
  it('fills a new page from the product, in the owner’s language', () => {
    const en = defaultBlocks(product, 'en')
    expect(en.map((b) => b.kind)).toContain('checkout')
    expect(en[0]).toMatchObject({ kind: 'hero', title: 'Rose Attar', text: 'Long lasting.' })
    expect(en.find((b) => b.kind === 'video')!.on).toBe(false)
    expect(en.find((b) => b.kind === 'packs')!.packs).toEqual([
      { qty: 1, price: 1000 },
      { qty: 2, price: 1900 },
      { qty: 3, price: 2700 },
    ])
    expect(defaultBlocks(product, 'bn').find((b) => b.kind === 'checkout')!.title).toBe(
      'এখনই অর্ডার করুন',
    )
  })

  it('validates a page and normalises the slug', () => {
    const page = landingInput.parse({
      title: 'Eid offer',
      slug: 'Eid-Offer',
      productId: '00000000-0000-4000-8000-000000000001',
      blocks: [{ kind: 'price', endsAt: '2027-01-01T00:00:00Z' }],
    })
    expect(page).toMatchObject({
      slug: 'eid-offer',
      design: 'bold',
      siteChrome: false,
      hidden: false,
    })
    expect(page.blocks[0]!.endsAt).toBeInstanceOf(Date)
    expect(landingInput.safeParse({ ...page, slug: 'no spaces' }).success).toBe(false)
  })

  it('keeps the URL prefix off the shop’s own paths', () => {
    expect(landingSettings.parse({})).toEqual({ prefix: 'offer' })
    expect(landingSettings.parse({ prefix: ' Deals ' })).toEqual({ prefix: 'deals' })
    expect(landingSettings.safeParse({ prefix: 'checkout' }).success).toBe(false)
    expect(landingSettings.safeParse({ prefix: 'two/parts' }).success).toBe(false)
  })

  it('moves blocks, keeping the ends in place', () => {
    expect(moveBlock(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveBlock(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
    expect(moveBlock(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(moveBlock(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })

  it('prices packs from shown pack blocks only, never above the plain price', () => {
    const blocks = defaultBlocks(product, 'en')
    expect(packPrice(blocks, 2, 1000)).toBe(1900)
    expect(packPrice(blocks, 4, 1000)).toBe(4000)
    const hidden = blocks.map((b) => (b.kind === 'packs' ? { ...b, on: false } : b))
    expect(packPrice(hidden, 2, 1000)).toBe(2000)
    // The product got cheaper than the pack: the shopper pays the lower price.
    expect(packPrice(blocks, 2, 500)).toBe(1000)
  })

  it('reports conversion, copy slugs and table rows', () => {
    expect(conversion(0, 0)).toBeNull()
    expect(conversion(300, 7)).toBe(2.3)
    expect(copySlug('eid', new Set(['eid']))).toBe('eid-copy')
    expect(copySlug('eid', new Set(['eid-copy', 'eid-copy-2']))).toBe('eid-copy-3')
    expect(splitRow('Fast | Slow')).toEqual(['Fast', 'Slow'])
    expect(splitRow('Just one')).toEqual(['Just one', ''])
  })
})
