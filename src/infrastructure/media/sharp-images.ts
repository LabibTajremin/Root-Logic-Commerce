import sharp, { type Metadata, type Stats } from 'sharp'
import type { ImagePort } from '@/modules/media'
import { DomainError } from '@/modules/shared'

const hex = (n: number) => n.toString(16).padStart(2, '0')

// rotate() applies EXIF orientation; sharp drops all metadata (EXIF/GPS) on output by default.
export const sharpImages: ImagePort = {
  async process(data, widths) {
    const img = sharp(data, { failOn: 'error' }).rotate()
    let meta: Metadata, stats: Stats
    try {
      ;[meta, stats] = await Promise.all([img.metadata(), img.stats()])
    } catch {
      throw new DomainError('media.type')
    }
    const width = meta.autoOrient.width
    const d = stats.dominant
    const variants = await Promise.all(
      widths(width).map(async (w) => ({
        width: w,
        data: new Uint8Array(
          await img.clone().resize({ width: w }).webp({ quality: 80 }).toBuffer(),
        ),
      })),
    )
    return { width, dominantColor: `#${hex(d.r)}${hex(d.g)}${hex(d.b)}`, variants }
  },
}
