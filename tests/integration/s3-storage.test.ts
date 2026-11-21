import { describe, expect, it } from 'vitest'
import { createS3Storage } from '@/infrastructure/storage/s3-storage'

const config = {
  endpoint: 'https://acc.r2.cloudflarestorage.com/',
  bucket: 'media',
  region: 'auto',
  accessKeyId: 'AKID',
  secretAccessKey: 'secret',
}

describe('S3 storage', () => {
  it('signs path-style PUT/GET requests and maps 404 to a miss', async () => {
    const seen: Request[] = []
    const objects = new Map<string, Uint8Array>()
    const fetcher = (async (req: Request) => {
      seen.push(req)
      const key = new URL(req.url).pathname
      if (req.method === 'PUT')
        return (objects.set(key, new Uint8Array(await req.arrayBuffer())), new Response(null))
      const body = objects.get(key)
      return body ? new Response(Buffer.from(body)) : new Response(null, { status: 404 })
    }) as typeof fetch
    const s = createS3Storage(config, fetcher)
    await s.put('store 1/m/320.webp', new Uint8Array([1, 2, 3]))
    expect(seen[0]!.url).toBe('https://acc.r2.cloudflarestorage.com/media/store%201/m/320.webp')
    expect(seen[0]!.headers.get('authorization')).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKID\/\d{8}\/auto\/s3\/aws4_request/,
    )
    expect(await s.get('store 1/m/320.webp')).toEqual(new Uint8Array([1, 2, 3]))
    expect(await s.get('nope')).toBeNull()
  })

  it('throws on other failures so uploads report them', async () => {
    const s = createS3Storage(
      config,
      (async () => new Response(null, { status: 403 })) as typeof fetch,
    )
    await expect(s.put('k', new Uint8Array(1))).rejects.toThrow('S3 PUT k failed: 403')
    await expect(s.get('k')).rejects.toThrow('S3 GET k failed: 403')
    expect(createS3Storage(config)).toHaveProperty('get')
  })
})
