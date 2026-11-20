import { describe, expect, it } from 'vitest'
import { assertUpload, parseDriveLink, sniffImage, variantWidths } from './media'

const bytes = (...b: number[]) => new Uint8Array([...b, ...new Array(16).fill(0)])

describe('media rules', () => {
  it('recognises images by their bytes, not their name', () => {
    expect(sniffImage(bytes(0xff, 0xd8, 0xff))).toBe('image/jpeg')
    expect(sniffImage(bytes(0x89, 0x50, 0x4e, 0x47))).toBe('image/png')
    expect(sniffImage(bytes(0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50))).toBe(
      'image/webp',
    )
    expect(sniffImage(bytes(0x47, 0x49, 0x46, 0x38))).toBe('image/gif')
    expect(sniffImage(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull()
  })

  it('enforces per-purpose size limits and the store quota', () => {
    const png = bytes(0x89, 0x50, 0x4e, 0x47)
    expect(() => assertUpload('product', png, 0, 100)).not.toThrow()
    expect(() =>
      assertUpload('favicon', new Uint8Array(1024 * 1024 + 1).fill(0x89), 0, 1e9),
    ).toThrow('media.too_large')
    expect(() =>
      assertUpload('product', new TextEncoder().encode('hello there friend'), 0, 1e9),
    ).toThrow('media.type')
    expect(() => assertUpload('product', png, 100, 100)).toThrow('media.quota_full')
  })

  it('makes 320/640/1024/1600 variants without upscaling', () => {
    expect(variantWidths(4000)).toEqual([320, 640, 1024, 1600])
    expect(variantWidths(800)).toEqual([320, 640])
    expect(variantWidths(200)).toEqual([200])
  })

  it('extracts the file id from every Drive share-link form', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345'
    for (const url of [
      `https://drive.google.com/file/d/${id}/view?usp=sharing`,
      `https://drive.google.com/open?id=${id}`,
      `https://drive.google.com/uc?export=download&id=${id}`,
      `https://drive.google.com/thumbnail?id=${id}&sz=w1000`,
      `https://docs.google.com/uc?id=${id}`,
      ` ${id} `,
    ])
      expect(parseDriveLink(url)).toBe(id)
    expect(parseDriveLink('https://example.com/file/d/abc/view')).toBeNull()
    expect(parseDriveLink('not a link')).toBeNull()
    expect(parseDriveLink('https://drive.google.com/drive/my-drive')).toBeNull()
    expect(parseDriveLink('https://drive.google.com/open?id=short')).toBeNull()
  })
})
