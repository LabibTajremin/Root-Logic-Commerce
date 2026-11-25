import { DomainError } from '@/modules/shared'

export const VARIANT_WIDTHS = [320, 640, 1024, 1600] as const
const MB = 1024 * 1024
export const UPLOAD_LIMITS = {
  product: 8 * MB,
  banner: 8 * MB,
  logo: 2 * MB,
  favicon: 1 * MB,
  // A7: WhatsApp/Messenger screenshots shoppers sent the owner.
  screenshot: 4 * MB,
  // B6: trade licence, BSTI and similar certificates.
  certificate: 4 * MB,
} as const
export type UploadPurpose = keyof typeof UPLOAD_LIMITS

const starts = (b: Uint8Array, sig: number[], at = 0) => sig.every((x, i) => b[at + i] === x)

// Only raster formats sharp re-encodes; SVG is refused (it can carry script).
export const sniffImage = (b: Uint8Array) => {
  if (starts(b, [0xff, 0xd8, 0xff])) return 'image/jpeg'
  if (starts(b, [0x89, 0x50, 0x4e, 0x47])) return 'image/png'
  if (starts(b, [0x52, 0x49, 0x46, 0x46]) && starts(b, [0x57, 0x45, 0x42, 0x50], 8))
    return 'image/webp'
  if (starts(b, [0x47, 0x49, 0x46, 0x38])) return 'image/gif'
  return null
}

export const assertUpload = (
  purpose: UploadPurpose,
  b: Uint8Array,
  usedBytes: number,
  quotaBytes: number,
) => {
  if (b.byteLength > UPLOAD_LIMITS[purpose])
    throw new DomainError('media.too_large', { max: UPLOAD_LIMITS[purpose] })
  if (!sniffImage(b)) throw new DomainError('media.type')
  if (usedBytes >= quotaBytes) throw new DomainError('media.quota_full')
}

/** Served widths: never upscale; tiny images keep their own width. */
export const variantWidths = (width: number) => {
  const ws = VARIANT_WIDTHS.filter((w) => w <= width)
  return ws.length ? [...ws] : [width]
}

const DRIVE_ID = /^[\w-]{25,}$/
export const parseDriveLink = (input: string) => {
  const s = input.trim()
  if (DRIVE_ID.test(s)) return s
  let url: URL
  try {
    url = new URL(s)
  } catch {
    return null
  }
  if (!/(^|\.)(drive|docs)\.google\.com$/.test(url.hostname)) return null
  const id = /\/d\/([\w-]+)/.exec(url.pathname)?.[1] ?? url.searchParams.get('id')
  return id && DRIVE_ID.test(id) ? id : null
}

// Promo videos are stored as uploaded (no server-side transcoding on a small VPS).
export const sniffVideo = (b: Uint8Array) => {
  if (starts(b, [0x66, 0x74, 0x79, 0x70], 4)) return 'mp4'
  if (starts(b, [0x1a, 0x45, 0xdf, 0xa3])) return 'webm'
  return null
}

export const assertVideo = (
  b: Uint8Array,
  maxBytes: number,
  usedBytes: number,
  quotaBytes: number,
) => {
  if (b.byteLength > maxBytes) throw new DomainError('media.video_too_large', { max: maxBytes })
  const ext = sniffVideo(b)
  if (!ext) throw new DomainError('media.video_type')
  if (usedBytes + b.byteLength > quotaBytes) throw new DomainError('media.quota_full')
  return ext
}
