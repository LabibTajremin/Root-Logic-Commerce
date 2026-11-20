import { isUuid } from '@/modules/shared'
import { runtime } from '@/server/runtime'
import { currentStore } from '@/server/request'

type Ctx = { params: Promise<{ id: string; w: string }> }

// Variants never change once written (new upload = new id), so they cache forever.
export const GET = async (_: Request, { params }: Ctx) => {
  const { id, w } = await params
  if (!isUuid(id) || !/^\d{1,4}$/.test(w)) return new Response(null, { status: 404 })
  const [store, { container }] = await Promise.all([currentStore(), runtime()])
  const file = await container.media.read(store.id, id, Number(w))
  if (!file) return new Response(null, { status: 404 })
  return new Response(Buffer.from(file.data), {
    headers: { 'content-type': file.type, 'cache-control': 'public, max-age=31536000, immutable' },
  })
}
