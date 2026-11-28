import { AwsClient } from 'aws4fetch'
import type { StoragePort } from '@/modules/media'

export type S3Config = {
  endpoint: string
  bucket: string
  region: string
  accessKeyId: string
  secretAccessKey: string
}

/** Any S3-compatible store (AWS S3, Cloudflare R2, MinIO) via signed path-style requests. */
export const createS3Storage = (c: S3Config, fetcher: typeof fetch = fetch): StoragePort => {
  const aws = new AwsClient({
    accessKeyId: c.accessKeyId,
    secretAccessKey: c.secretAccessKey,
    region: c.region,
    service: 's3',
  })
  const url = (key: string) =>
    `${c.endpoint.replace(/\/$/, '')}/${c.bucket}/${key.split('/').map(encodeURIComponent).join('/')}`
  const send = async (key: string, init: RequestInit) => fetcher(await aws.sign(url(key), init))
  return {
    async put(key, data) {
      const res = await send(key, { method: 'PUT', body: Buffer.from(data) })
      if (res.ok) return
      throw new Error(`S3 PUT ${key} failed: ${res.status}`)
    },
    async get(key) {
      const res = await send(key, { method: 'GET' })
      if (res.status === 404) return null
      if (res.ok) return new Uint8Array(await res.arrayBuffer())
      throw new Error(`S3 GET ${key} failed: ${res.status}`)
    },
  }
}
