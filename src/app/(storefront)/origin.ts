import { headers } from 'next/headers'

/** This store's public origin, from the request (each store has its own domain). */
export const origin = async () => {
  const h = await headers()
  return `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
}
