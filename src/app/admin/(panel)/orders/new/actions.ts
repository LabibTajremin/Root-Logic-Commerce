'use server'

import { authorize } from '@/modules/access'
import type { OrderSource } from '@/modules/orders'
import { currentSettings } from '@/server/request'
import { activeModules, shopRulesOf } from '@/app/(storefront)/shop-rules'
import { act, type ActionState } from '../../act'
import { adminContext } from '../../context'

export type Customer = { name: string; address: string; area: string; district: string }

/** C12: the name and address last used with this phone, to fill the form. */
export async function findCustomer(phone: string): Promise<Customer | null> {
  const { orders, store, actor } = await adminContext('orders.manage')
  authorize(actor, 'orders.manage', store.id)
  const o = await orders.lastForPhone(store.id, phone)
  return (
    o && { name: o.shipName, address: o.shipAddress, area: o.shipArea, district: o.shipDistrict }
  )
}

// Every key read is an input of the new-order form.
export async function createManualOrder(_: ActionState, form: FormData) {
  return act('orders.manage', async ({ orders, store, features }) => {
    const { business } = await currentSettings()
    const f = (k: string) => String(form.get(k))
    const order = await orders.placeOrder(
      store.id,
      {
        name: f('name'),
        phone: f('phone'),
        district: f('district'),
        area: f('area'),
        address: f('address'),
        note: f('note'),
        zoneId: f('zoneId'),
        items: JSON.parse(f('items')),
      },
      shopRulesOf(business, activeModules(await features.list(store.id))),
      { source: f('source') as OrderSource, discount: Math.round(Number(f('discount')) * 100) },
    )
    return `/admin/orders/${order.id}`
  })
}
