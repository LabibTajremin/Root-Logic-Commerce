'use server'

import { authorize } from '@/modules/access'
import { adminContext } from './context'

export type SearchHit = { href: string; label: string; detail: string }

/** ⌘K: orders by number or phone, products by name — at most five of each. */
export async function adminSearch(
  q: string,
): Promise<{ orders: SearchHit[]; products: SearchHit[] }> {
  const { actor, store, orders, catalog, money } = await adminContext('orders.manage')
  authorize(actor, 'orders.manage', store.id)
  const [o, p] = await Promise.all([
    orders.listOrders(store.id, { search: q, limit: 5 }),
    catalog.listProducts(store.id, { search: q }),
  ])
  return {
    orders: o.rows.map((r) => ({
      href: `/admin/orders/${r.id}`,
      label: `#${r.orderNo} · ${r.shipName}`,
      detail: `${r.shipPhone} · ${money(r.total)}`,
    })),
    products: p.slice(0, 5).map((r) => ({
      href: `/admin/products/${r.id}`,
      label: r.name,
      detail: money(r.price),
    })),
  }
}
