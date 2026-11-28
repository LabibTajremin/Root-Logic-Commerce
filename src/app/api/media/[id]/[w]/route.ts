import { isUuid } from '@/modules/shared'
import { runtime } from '@/server/runtime'
import { currentStore } from '@/server/request'

type Ctx = { params: Promise<{ id: string; w: string }> }

// Files never change once written (new upload = new id), so they cache forever.
const CACHE = 'public, max-age=31536000, immutable'

export const GET = async (req: Request, { params }: Ctx) => {
  const { id, w } = await params
  if (!isUuid(id) || !/^\d{1,4}$/.test(w)) return new Response(null, { status: 404 })
  const [store, { container }] = await Promise.all([currentStore(), runtime()])
  const file = await container.media.read(store.id, id, Number(w))
  if (!file) return new Response(null, { status: 404 })
  const body = Buffer.from(file.data)
  // Video players fetch byte ranges (seeking; Safari requires it).
  const range = /^bytes=(\d+)-(\d*)$/.exec(String(req.headers.get('range')))
  if (range) {
    const start = Number(range[1])
    const end = Math.min(range[2] ? Number(range[2]) : body.length - 1, body.length - 1)
    if (start > end)
      return new Response(null, {
        status: 416,
        headers: { 'content-range': `bytes */${body.length}` },
      })
    return new Response(body.subarray(start, end + 1), {
      status: 206,
      headers: {
        'content-type': file.type,
        'content-range': `bytes ${start}-${end}/${body.length}`,
        'accept-ranges': 'bytes',
        'cache-control': CACHE,
      },
    })
  }
  return new Response(body, {
    headers: { 'content-type': file.type, 'accept-ranges': 'bytes', 'cache-control': CACHE },
  })
}
