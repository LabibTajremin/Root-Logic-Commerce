import { isDomainError } from '@/modules/shared'
import { runtime } from '@/server/runtime'

type Ctx = { params: Promise<{ token: string }> }

/** E2: couriers post status changes here; the URL token names (and authenticates) the account. */
export const POST = async (req: Request, { params }: Ctx) => {
  const { container } = await runtime()
  const body: unknown = await req.json().catch(() => null)
  try {
    const applied = await container.courier.webhook((await params).token, body)
    return Response.json({ applied })
  } catch (e) {
    if (isDomainError(e)) return new Response(null, { status: 404 })
    throw e
  }
}
