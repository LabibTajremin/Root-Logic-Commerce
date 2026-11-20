import { DomainError } from '@/modules/shared'
import { assertUpload, parseDriveLink, variantWidths, type UploadPurpose } from '../domain/media'
import type { DrivePort, ImagePort, MediaRepo, MediaRow, StoragePort } from './ports'

type Deps = {
  repo: MediaRepo
  storage: StoragePort
  images: ImagePort
  drive: DrivePort
  quotaBytes: number
  newId: () => string
}

const DRIVE_WIDTHS = [320, 640, 1024, 1600]
const DRIVE_PLACEHOLDER = '#E5E7EB'

/** Widths a client may request for this media (srcset candidates). */
export const servedWidths = (m: Pick<MediaRow, 'kind' | 'width'>) =>
  m.kind === 'upload' ? variantWidths(m.width!) : DRIVE_WIDTHS

export const createMedia = ({ repo, storage, images, drive, quotaBytes, newId }: Deps) => ({
  async upload(storeId: string, purpose: UploadPurpose, data: Uint8Array) {
    assertUpload(purpose, data, await repo.usedBytes(storeId), quotaBytes)
    const img = await images.process(data, variantWidths)
    const ref = `${storeId}/${newId()}`
    for (const v of img.variants) await storage.put(`${ref}/${v.width}.webp`, v.data)
    return repo.insert(storeId, {
      kind: 'upload',
      ref,
      width: img.width,
      bytes: img.variants.reduce((s, v) => s + v.data.byteLength, 0),
      dominantColor: img.dominantColor,
    })
  },

  async addDriveLink(storeId: string, link: string) {
    const id = parseDriveLink(link)
    if (!id) throw new DomainError('media.drive_link')
    return repo.insert(storeId, {
      kind: 'gdrive',
      ref: id,
      width: null,
      bytes: 0,
      dominantColor: DRIVE_PLACEHOLDER,
    })
  },

  usage: async (storeId: string) => ({ used: await repo.usedBytes(storeId), quota: quotaBytes }),
  async attach(storeId: string, productId: string, mediaId: string) {
    if (!(await repo.attach(storeId, productId, mediaId))) throw new DomainError('media.not_found')
  },
  detach: (storeId: string, productId: string, mediaId: string) =>
    repo.detach(storeId, productId, mediaId),
  forProducts: (storeId: string, productIds: string[]) => repo.forProducts(storeId, productIds),

  /** Bytes for /api/media: the smallest stored variant at least `width` wide (else the largest). */
  async read(storeId: string, id: string, width: number) {
    const m = await repo.get(storeId, id)
    if (!m) return null
    const ws = servedWidths(m)
    const w = ws.find((x) => x >= width) ?? ws.at(-1)!
    if (m.kind === 'gdrive') return drive.fetch(m.ref, w)
    const data = await storage.get(`${m.ref}/${w}.webp`)
    return data && { data, type: 'image/webp' }
  },
})

export type Media = ReturnType<typeof createMedia>
