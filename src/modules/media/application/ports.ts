export type MediaRow = {
  id: string
  kind: 'upload' | 'gdrive'
  /** upload: storage key prefix; gdrive: Drive file id. */
  ref: string
  width: number | null
  bytes: number
  /** Placeholder shown while the image loads. */
  dominantColor: string
}
export type NewMedia = Omit<MediaRow, 'id'>

export type MediaRepo = {
  usedBytes(storeId: string): Promise<number>
  insert(storeId: string, row: NewMedia): Promise<MediaRow>
  get(storeId: string, id: string): Promise<MediaRow | null>
  /** False when the product or media is not this store's. */
  attach(storeId: string, productId: string, mediaId: string): Promise<boolean>
  /** Unlinks and marks the media orphaned (nightly cleanup deletes it after 7 days). */
  detach(storeId: string, productId: string, mediaId: string): Promise<void>
  forProducts(
    storeId: string,
    productIds: string[],
  ): Promise<{ productId: string; media: MediaRow }[]>
}

export type StoragePort = {
  put(key: string, data: Uint8Array): Promise<void>
  get(key: string): Promise<Uint8Array | null>
}

export type ProcessedImage = {
  width: number
  dominantColor: string
  variants: { width: number; data: Uint8Array }[]
}
export type ImagePort = {
  /** Re-encodes (strips EXIF) into WebP at the given widths; throws media.type if undecodable. */
  process(data: Uint8Array, widths: (originalWidth: number) => number[]): Promise<ProcessedImage>
}

export type DrivePort = {
  fetch(fileId: string, width: number): Promise<{ data: Uint8Array; type: string } | null>
}
