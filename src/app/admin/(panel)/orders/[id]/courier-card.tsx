import Link from 'next/link'
import type { OrderDetail } from '@/modules/orders'
import { ActionForm } from '@/ui/action-form'
import { Badge, Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { sendToCourier } from '../../couriers/actions'

/** E1/E2: the order's parcel (tracking, the courier's own status) or the form that sends it. */
export const CourierCard = async ({ order }: { order: OrderDetail }) => {
  const { courier, features, store, t, money } = await adminContext('orders.manage')
  if (!(await features.isOn(store.id, 'courier'))) return null
  const [shipment, accounts] = await Promise.all([
    courier.shipmentFor(store.id, order.id),
    courier.listAccounts(store.id),
  ])
  if (shipment)
    return (
      <div data-testid="shipment">
        <Card className="flex flex-col gap-2 text-sm">
          <h2 className="flex flex-wrap items-center gap-2 font-semibold">
            {t(`courier.${shipment.provider}`)}
            <Badge>{shipment.rawStatus}</Badge>
          </h2>
          <p>
            {t('courier.tracking')}: <span className="font-semibold">{shipment.tracking}</span>
          </p>
          <p>
            {t('courier.cod')}: {money(shipment.cod)}
            {shipment.charge !== null && ` · ${t('courier.charge')}: ${money(shipment.charge)}`}
          </p>
        </Card>
      </div>
    )
  if (order.status !== 'CONFIRMED' && order.status !== 'PROCESSING') return null
  if (accounts.length === 0)
    return (
      <Card className="flex flex-wrap items-center gap-2 text-sm">
        <p className="text-muted">{t('courier.noAccount')}</p>
        <Link href="/admin/couriers" className="font-semibold underline">
          {t('courier.setUp')}
        </Link>
      </Card>
    )
  return (
    <Card>
      <ActionForm action={sendToCourier} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={order.id} />
        <div className="flex flex-col gap-1.5 text-sm font-semibold">
          <label htmlFor="courier-account">{t('courier.sendWith')}</label>
          <select
            id="courier-account"
            name="account"
            defaultValue={accounts.find((a) => a.isDefault)?.id}
            className="min-h-11 rounded-control border border-line bg-surface px-3 font-normal"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label} · {t(`courier.${a.provider}`)}
              </option>
            ))}
          </select>
        </div>
        <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
          {t('courier.send')}
        </button>
      </ActionForm>
    </Card>
  )
}
