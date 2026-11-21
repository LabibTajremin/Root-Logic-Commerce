import { normalizeHost } from '@/server/tenant'
import { runtime } from '@/server/runtime'

/**
 * Caddy's on-demand TLS asks here before getting a certificate for a new host:
 * 200 only for domains a store owns, so strangers can't make the server request certificates.
 */
export const GET = async (req: Request) => {
  const { container } = await runtime()
  const domain = normalizeHost(new URL(req.url).searchParams.get('domain'))
  const store = await container.stores.findByHost(domain)
  return new Response(null, { status: store ? 200 : 404 })
}
