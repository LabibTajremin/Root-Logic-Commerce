import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { createMediaRepo } from '@/infrastructure/db/repositories/media-repo'
import { createCatalogRepo } from '@/infrastructure/db/repositories/catalog-repo'
import { createDrive } from '@/infrastructure/media/drive'
import { sharpImages } from '@/infrastructure/media/sharp-images'
import { createLocalStorage } from '@/infrastructure/storage/local-storage'
import { variantWidths } from '@/modules/media'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

const tmp = () => mkdtempSync(join(tmpdir(), 'rlc-media-'))

describe('media repo', () => {
  it('sums bytes, attaches within the store only, lists in order and orphans on detach', async () => {
    const db = await createTestDb()
    const [a, b] = [await seedStore(db, 'a'), await seedStore(db, 'b')]
    const repo = createMediaRepo(db)
    const catalog = createCatalogRepo(db)
    const product = async (store: string, slug: string) =>
      (
        await catalog.insertProduct(store, {
          name: slug,
          slug,
          description: '',
          price: 100,
          compareAtPrice: null,
          costPrice: 0,
          stock: 1,
          lowStockThreshold: 1,
          sku: null,
          status: 'active',
          categoryId: null,
          brandId: null,
          videoUrl: null,
          seoTitle: null,
          seoDescription: null,
          badge: null,
          content: { specs: [], howTo: [], faq: [], benefits: [], whyBuy: [] },
        })
      ).id
    const [p, q] = [await product(a, 'p'), await product(b, 'q')]
    expect(await repo.usedBytes(a)).toBe(0)
    const m1 = await repo.insert(a, {
      kind: 'upload',
      ref: 'a/1',
      width: 800,
      bytes: 10,
      dominantColor: '#000000',
    })
    const m2 = await repo.insert(a, {
      kind: 'gdrive',
      ref: 'x'.repeat(30),
      width: null,
      bytes: 0,
      dominantColor: '#000000',
    })
    const mb = await repo.insert(b, {
      kind: 'upload',
      ref: 'b/1',
      width: 320,
      bytes: 5,
      dominantColor: '#000000',
    })
    expect(await repo.usedBytes(a)).toBe(10)
    expect(await repo.get(a, m1.id)).toEqual(m1)
    expect(await repo.get(b, m1.id)).toBeNull()
    expect(await repo.attach(a, p, m1.id)).toBe(true)
    expect(await repo.attach(a, p, m2.id)).toBe(true)
    expect(await repo.attach(a, p, m1.id)).toBe(true)
    expect(await repo.attach(a, q, m1.id)).toBe(false)
    expect(await repo.attach(a, p, mb.id)).toBe(false)
    expect(await repo.forProducts(a, [])).toEqual([])
    expect((await repo.forProducts(a, [p, q])).map((r) => r.media.id)).toEqual([m1.id, m2.id])
    await repo.detach(a, p, m1.id)
    expect((await repo.forProducts(a, [p])).map((r) => r.media.id)).toEqual([m2.id])
  })
})

describe('local storage', () => {
  it('writes, reads, misses and refuses keys outside its root or a full disk', async () => {
    const root = tmp()
    const s = createLocalStorage(root, 1)
    await s.put('s1/m/320.webp', new Uint8Array([1, 2]))
    expect(await s.get('s1/m/320.webp')).toEqual(new Uint8Array([1, 2]))
    expect(await s.get('s1/nope.webp')).toBeNull()
    await expect(s.get('../escape')).rejects.toThrow('escapes root')
    mkdirSync(join(root, 'dir.webp'))
    await expect(s.get('dir.webp')).rejects.toThrow()
    await expect(
      createLocalStorage(root, Number.MAX_SAFE_INTEGER).put('k', new Uint8Array(1)),
    ).rejects.toThrow('media.disk_full')
    writeFileSync(join(root, 'plain'), 'x')
  })
})

describe('sharp images', () => {
  it('re-encodes to WebP variants, keeps orientation and finds the dominant colour', async () => {
    const jpeg = await sharp({
      create: { width: 1200, height: 900, channels: 3, background: '#3c6430' },
    })
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer()
    const r = await sharpImages.process(new Uint8Array(jpeg), variantWidths)
    expect(r.width).toBe(900)
    expect(r.variants.map((v) => v.width)).toEqual([320, 640])
    expect(r.dominantColor).toMatch(/^#[0-9a-f]{6}$/)
    const meta = await sharp(Buffer.from(r.variants[1]!.data)).metadata()
    expect(meta).toMatchObject({ format: 'webp', width: 640 })
    expect(meta.exif).toBeUndefined()
  })

  it('rejects bytes that only look like an image', async () => {
    const fake = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0])
    await expect(sharpImages.process(fake, variantWidths)).rejects.toThrow('media.type')
  })
})

describe('drive', () => {
  it('fetches the thumbnail at the requested width; non-images are misses', async () => {
    const calls: string[] = []
    const fake = (async (url: string) => {
      calls.push(url)
      if (url.includes('id=html'))
        return new Response('<html>', { headers: { 'content-type': 'text/html' } })
      if (url.includes('id=gone')) return new Response(null, { status: 404 })
      if (url.includes('id=bare')) return new Response(new Uint8Array([1]))
      if (url.includes('id=down')) throw new TypeError('fetch failed')
      return new Response(new Uint8Array([7]), { headers: { 'content-type': 'image/jpeg' } })
    }) as typeof fetch
    const d = createDrive(fake)
    expect(await d.fetch('abc', 640)).toEqual({ data: new Uint8Array([7]), type: 'image/jpeg' })
    expect(calls[0]).toBe('https://drive.google.com/thumbnail?id=abc&sz=w640')
    expect(await d.fetch('html', 320)).toBeNull()
    expect(await d.fetch('gone', 320)).toBeNull()
    expect(await d.fetch('bare', 320)).toBeNull()
    expect(await d.fetch('down', 320)).toBeNull()
    expect(createDrive()).toHaveProperty('fetch')
  })
})
