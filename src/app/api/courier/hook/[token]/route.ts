import { runtime } from '@/server/runtime'

type Ctx = { params: Promise<{ token: string }> }

/** E2: couriers post status changes here; the URL token names (and authenticates) the account. */
export const POST = async (req: Request, { params }: Ctx) => {
  const { container } = await runtime()
  // A body that isn't JSON is simply not a status update.
  const body: unknown = await req.json().catch(() => null)
  const applied = await container.courier.webhook((await params).token, body)
  return applied === null ? new Response(null, { status: 404 }) : Response.json({ applied })
}
