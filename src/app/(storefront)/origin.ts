import { headers } from 'next/headers'

/** This store's public origin, from the request (each store has its own domain). */
export const origin = async () => {
  const h = await headers()
  // Next always sets x-forwarded-proto (from the proxy, else from its own socket).
  return `${h.get('x-forwarded-proto')}://${h.get('host')}`
}
