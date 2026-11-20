import { runtime } from '@/server/runtime'
import { currentStore } from '@/server/request'

/** First-party page-view beacon (sendBeacon posts the path as text). Always 204: never breaks a page. */
export const POST = async (req: Request) => {
  const [store, { container }] = await Promise.all([currentStore(), runtime()])
  const path = (await req.text()).slice(0, 300)
  // Next sets x-forwarded-for itself (from the proxy, else the socket), so it is always there.
  const ip = String(req.headers.get('x-forwarded-for')).split(',')[0]!.trim()
  const ua = String(req.headers.get('user-agent'))
  if (path.startsWith('/')) await container.insights.track(store.id, { ip, ua, path })
  return new Response(null, { status: 204 })
}
