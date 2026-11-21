import { createHmac, timingSafeEqual } from 'node:crypto'

export const PREVIEW_COOKIE = 'rlc-preview'

const sign = (secret: string, storeId: string, preset: string) =>
  createHmac('sha256', secret).update(`${storeId}:${preset}`).digest('base64url')

/** Cookie value for an owner previewing a layout preset; bound to the store. */
export const previewValue = (secret: string, storeId: string, preset: string) =>
  `${preset}.${sign(secret, storeId, preset)}`

/** The previewed preset id, or null when the cookie is missing or forged. */
export const readPreview = (secret: string, storeId: string, value: string | undefined) => {
  const dot = value?.lastIndexOf('.') ?? -1
  if (!value || dot < 1) return null
  const preset = value.slice(0, dot)
  const got = Buffer.from(value.slice(dot + 1))
  const want = Buffer.from(sign(secret, storeId, preset))
  return got.length === want.length && timingSafeEqual(got, want) ? preset : null
}
