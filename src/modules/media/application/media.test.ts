import { describe, expect, it } from 'vitest'
import { createMedia, servedWidths } from './media'
import type { MediaRepo, MediaRow } from './ports'

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, ...new Array(60).fill(1)])
const DRIVE_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345'

const setup = (quotaBytes = 10_000) => {
  const rows: (MediaRow & { storeId: string })[] = []
  const links: { productId: string; mediaId: string }[] = []
  const files = new Map<string, Uint8Array>()
  const repo: MediaRepo = {
    usedBytes: async (s) => rows.filter((r) => r.storeId === s).reduce((n, r) => n + r.bytes, 0),
    insert: async (s, m) => {
      const r = { ...m, id: `m${rows.length}`, storeId: s }
      rows.push(r)
      return r
    },
    get: async (s, id) => rows.find((r) => r.storeId === s && r.id === id) ?? null,
    attach: async (s, productId, mediaId) =>
      productId !== 'other' && rows.some((r) => r.id === mediaId && r.storeId === s)
        ? (links.push({ productId, mediaId }), true)
        : false,
    detach: async (_s, productId, mediaId) => {
      links.splice(
        links.findIndex((l) => l.productId === productId && l.mediaId === mediaId),
        1,
      )
    },
    forProducts: async (_s, ids) =>
      links
        .filter((l) => ids.includes(l.productId))
        .map((l) => ({ productId: l.productId, media: rows.find((r) => r.id === l.mediaId)! })),
  }
  const media = createMedia({
    repo,
    storage: { put: async (k, d) => void files.set(k, d), get: async (k) => files.get(k) ?? null },
    images: {
      process: async (_d, widths) => ({
        width: 800,
        dominantColor: '#aabbcc',
        variants: widths(800).map((w) => ({ width: w, data: new Uint8Array(w / 10) })),
      }),
    },
    drive: {
      fetch: async (id, w) => ({
        data: new TextEncoder().encode(`${id}@${w}`),
        type: 'image/jpeg',
      }),
    },
    quotaBytes,
    videoMaxBytes: 100,
    newId: () => 'uuid',
  })
  return { media, files, links }
}

describe('media', () => {
  it('stores WebP variants, records size and colour, and serves the nearest width', async () => {
    const { media, files } = setup()
    const m = await media.upload('s1', 'product', PNG)
    expect(m).toMatchObject({
      kind: 'upload',
      ref: 's1/uuid',
      width: 800,
      bytes: 96,
      dominantColor: '#aabbcc',
    })
    expect([...files.keys()]).toEqual(['s1/uuid/320.webp', 's1/uuid/640.webp'])
    expect(await media.read('s1', m.id, 400)).toEqual({
      data: files.get('s1/uuid/640.webp'),
      type: 'image/webp',
    })
    expect((await media.read('s1', m.id, 3000))!.data).toBe(files.get('s1/uuid/640.webp'))
    expect(await media.read('s2', m.id, 320)).toBeNull()
    files.clear()
    expect(await media.read('s1', m.id, 320)).toBeNull()
    expect(await media.usage('s1')).toEqual({ used: 96, quota: 10_000 })
  })

  it('blocks uploads once the store quota is used up', async () => {
    const { media } = setup(96)
    await media.upload('s1', 'product', PNG)
    await expect(media.upload('s1', 'product', PNG)).rejects.toThrow('media.quota_full')
    await media.upload('s2', 'logo', PNG)
  })

  it('accepts Drive links and proxies them at Drive-sized widths', async () => {
    const { media } = setup()
    await expect(media.addDriveLink('s1', 'https://example.com/x')).rejects.toThrow(
      'media.drive_link',
    )
    const m = await media.addDriveLink('s1', `https://drive.google.com/file/d/${DRIVE_ID}/view`)
    expect(m).toMatchObject({ kind: 'gdrive', ref: DRIVE_ID, bytes: 0, dominantColor: '#E5E7EB' })
    expect(servedWidths(m)).toEqual([320, 640, 1024, 1600])
    expect(new TextDecoder().decode((await media.read('s1', m.id, 700))!.data)).toBe(
      `${DRIVE_ID}@1024`,
    )
  })

  it('attaches only this store’s media to products and detaches them', async () => {
    const { media, links } = setup()
    const m = await media.upload('s1', 'product', PNG)
    await media.attach('s1', 'p1', m.id)
    await expect(media.attach('s2', 'p1', m.id)).rejects.toThrow('media.not_found')
    await expect(media.attach('s1', 'other', m.id)).rejects.toThrow('media.not_found')
    expect(await media.forProducts('s1', ['p1'])).toEqual([{ productId: 'p1', media: m }])
    await media.detach('s1', 'p1', m.id)
    expect(links).toEqual([])
  })

  it('stores videos as uploaded and serves them whole', async () => {
    const { media, files } = setup()
    const mp4 = new Uint8Array([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 1, 2])
    const v = await media.uploadVideo('s1', mp4)
    expect(v).toMatchObject({ kind: 'video', ref: 's1/uuid.mp4', bytes: 10 })
    expect(await media.read('s1', v.id, 0)).toEqual({ data: mp4, type: 'video/mp4' })
    files.clear()
    expect(await media.read('s1', v.id, 0)).toBeNull()
  })
})
