import { timingSafeEqual } from 'node:crypto'
import { runtime } from '@/server/runtime'

const same = (a: string, b: string) =>
  a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b))

/** Sends due messages for every store and trims old raw page views. Vercel Cron calls it with `Authorization: Bearer $CRON_SECRET`. */
export const GET = async (req: Request) => {
  const { config, container } = await runtime()
  const auth = req.headers.get('authorization') ?? ''
  if (!config.cronSecret || !same(auth, `Bearer ${config.cronSecret}`))
    return new Response(null, { status: 401 })
  const [result] = await Promise.all([
    container.messaging.processDue(100),
    container.insights.purge(),
  ])
  return Response.json(result)
}
