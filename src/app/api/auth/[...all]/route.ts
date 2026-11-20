import { runtime } from '@/server/runtime'

const handle = async (req: Request) => (await runtime()).auth.handler(req)

export const GET = handle
export const POST = handle
