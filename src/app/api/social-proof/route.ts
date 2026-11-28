import { storefront } from '@/app/(storefront)/storefront'

/** B7: the shop's recent confirmed orders for the "someone just ordered" toast. */
export const GET = async () => {
  const { on, orders, store } = await storefront()
  return Response.json(on('socialProof') ? await orders.socialProof(store.id, new Date()) : [])
}
