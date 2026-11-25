import { canTransition, type OrderDetail, type OrderStatus } from '@/modules/orders'
import { DomainError, validate } from '@/modules/shared'
import {
  accountInput,
  amountsInput,
  collectedOf,
  courierReport,
  credentialSchemas,
  orderStatusFor,
  parcelState,
  readWebhook,
  type AccountInput,
  type CourierProvider,
  type Credentials,
  type ParcelFact,
  type ParcelState,
} from '../domain/courier'

export type Parcel = {
  invoice: string
  name: string
  phone: string
  address: string
  district: string
  /** Cash to collect, in paisa. */
  cod: number
  note: string
}
export type Created = { ref: string; tracking: string; charge: number | null }
/** E1: one courier's merchant API for one shop's account. */
export type CourierApi = {
  create(p: Parcel): Promise<Created>
  status(ref: string): Promise<string>
}
export type ApiFactory = <P extends CourierProvider>(
  provider: P,
  creds: Credentials[P],
) => CourierApi

export type Account = {
  id: string
  provider: CourierProvider
  label: string
  isDefault: boolean
  webhookToken: string
  createdAt: Date
}
export type Shipment = {
  id: string
  storeId: string
  orderId: string
  accountId: string | null
  provider: CourierProvider
  ref: string
  tracking: string
  cod: number
  charge: number | null
  rawStatus: string
  state: ParcelState
  /** E5: cash the courier says it collected (null = not entered). */
  codCollected: number | null
  /** E5: when the courier paid this parcel's money to the shop. */
  paidOutAt: Date | null
  createdAt: Date
  updatedAt: Date
}
export type NewShipment = Omit<
  Shipment,
  'id' | 'storeId' | 'codCollected' | 'paidOutAt' | 'createdAt' | 'updatedAt'
>
export type ReportFilter = { from?: Date; to?: Date; productId?: string }
/** E5: a delivered parcel the courier still owes money for. */
export type Unsettled = Shipment & { orderNo: number }

export type CourierRepo = {
  addAccount(
    storeId: string,
    a: { provider: CourierProvider; label: string; sealed: string; webhookToken: string },
  ): Promise<string>
  listAccounts(storeId: string): Promise<Account[]>
  removeAccount(storeId: string, id: string): Promise<void>
  setDefault(storeId: string, id: string): Promise<void>
  sealed(storeId: string, id: string): Promise<{ provider: CourierProvider; sealed: string } | null>
  accountByToken(
    token: string,
  ): Promise<{ id: string; storeId: string; provider: CourierProvider } | null>
  addShipment(storeId: string, s: NewShipment): Promise<Shipment>
  shipmentForOrder(storeId: string, orderId: string): Promise<Shipment | null>
  shipmentByRef(accountId: string, ref: string): Promise<Shipment | null>
  updateShipment(
    storeId: string,
    id: string,
    s: { rawStatus: string; state: ParcelState; charge: number | null; payload: unknown },
  ): Promise<void>
  /** Parcels still moving that nobody has heard about since `before`. */
  staleShipments(before: Date, limit: number): Promise<Shipment[]>
  parcelFacts(storeId: string, f: ReportFilter): Promise<ParcelFact[]>
  unsettled(storeId: string): Promise<Unsettled[]>
  setAmounts(storeId: string, id: string, a: { collected: number; charge: number }): Promise<void>
  markPaid(storeId: string, ids: string[], at: Date): Promise<number>
  /** E5: what the couriers charged for parcels sent since `since`. */
  chargesSince(storeId: string, since: Date): Promise<number>
}

type Deps = {
  repo: CourierRepo
  api: ApiFactory
  box: { seal(s: string): string; open(s: string): string }
  orders: {
    getOrder(storeId: string, id: string): Promise<OrderDetail | null>
    changeStatus(
      storeId: string,
      id: string,
      to: OrderStatus,
      actorId: string | null,
      note?: string | null,
    ): Promise<void>
  }
  token: () => string
  now: () => Date
}

const names: Record<CourierProvider, string> = {
  steadfast: 'Steadfast',
  pathao: 'Pathao',
  redx: 'RedX',
}

export const createCourier = ({ repo, api, box, orders, token, now }: Deps) => {
  const apiFor = async (storeId: string, accountId: string) => {
    const a = await repo.sealed(storeId, accountId)
    if (!a) throw new DomainError('courier.account_not_found')
    return { provider: a.provider, api: api(a.provider, JSON.parse(box.open(a.sealed))) }
  }

  /** E2: record what the courier said and move the order when the move is allowed. */
  const apply = async (s: Shipment, raw: string, charge: number | null, payload: unknown) => {
    const state = parcelState(s.provider, raw)
    await repo.updateShipment(s.storeId, s.id, {
      rawStatus: raw,
      state,
      charge: charge ?? s.charge,
      payload,
    })
    const to = orderStatusFor(state)
    const order = await orders.getOrder(s.storeId, s.orderId)
    if (!to || !order || order.status === to || !canTransition(order.status, to)) return
    await orders.changeStatus(s.storeId, s.orderId, to, null, `courier: ${raw}`)
  }

  return {
    async addAccount(storeId: string, input: AccountInput) {
      const a = validate(accountInput, input)
      const creds = validate(credentialSchemas[a.provider], a.credentials)
      return repo.addAccount(storeId, {
        provider: a.provider,
        label: a.label,
        sealed: box.seal(JSON.stringify(creds)),
        webhookToken: token(),
      })
    },
    listAccounts: (storeId: string) => repo.listAccounts(storeId),
    removeAccount: (storeId: string, id: string) => repo.removeAccount(storeId, id),
    setDefault: (storeId: string, id: string) => repo.setDefault(storeId, id),
    shipmentFor: (storeId: string, orderId: string) => repo.shipmentForOrder(storeId, orderId),

    /** E1: hand a confirmed order to a courier (the default one unless chosen) → SHIPPED. */
    async send(storeId: string, orderId: string, accountId: string | null, actorId: string | null) {
      const order = await orders.getOrder(storeId, orderId)
      if (!order) throw new DomainError('order.not_found')
      if (order.status !== 'CONFIRMED' && order.status !== 'PROCESSING')
        throw new DomainError('courier.not_ready')
      if (await repo.shipmentForOrder(storeId, orderId))
        throw new DomainError('courier.already_sent')
      const id = accountId ?? (await repo.listAccounts(storeId)).find((a) => a.isDefault)?.id
      if (!id) throw new DomainError('courier.no_account')
      const { provider, api: courier } = await apiFor(storeId, id)
      const c = await courier
        .create({
          invoice: String(order.orderNo),
          name: order.shipName,
          phone: order.shipPhone,
          address: [order.shipAddress, order.shipArea, order.shipDistrict]
            .filter(Boolean)
            .join(', '),
          district: order.shipDistrict,
          // The amount still due; a paid order is collected by nobody.
          cod: order.paymentStatus === 'paid' ? 0 : order.total,
          note: order.note ?? '',
        })
        // The courier said no (keys, area, limits): say so instead of a generic error.
        .catch((e: unknown) => {
          throw new DomainError('courier.refused', { reason: String(e) })
        })
      const s = await repo.addShipment(storeId, {
        orderId,
        accountId: id,
        provider,
        ref: c.ref,
        tracking: c.tracking,
        cod: order.paymentStatus === 'paid' ? 0 : order.total,
        charge: c.charge,
        rawStatus: 'pending',
        state: 'pending',
      })
      const note = `courier: ${names[provider]} ${c.tracking}`
      if (order.status === 'CONFIRMED')
        await orders.changeStatus(storeId, orderId, 'PROCESSING', actorId, note)
      await orders.changeStatus(storeId, orderId, 'SHIPPED', actorId, note)
      return s
    },

    /** E2: a courier's webhook, addressed by the account's secret token (null = no such link). */
    async webhook(token: string, body: unknown) {
      const a = await repo.accountByToken(token)
      if (!a) return null
      const u = readWebhook(a.provider, body)
      const s = u && (await repo.shipmentByRef(a.id, u.ref))
      if (!u || !s) return false
      await apply(s, u.raw, u.charge, body)
      return true
    },

    /** E3: how each courier does, for parcels sent in the range (and with the product). */
    report: async (storeId: string, f: ReportFilter = {}) =>
      courierReport(await repo.parcelFacts(storeId, f)),

    /** E5: delivered parcels not paid out yet, and what the couriers owe in total. */
    async unsettled(storeId: string) {
      const rows = (await repo.unsettled(storeId)).map((s) => ({ ...s, collected: collectedOf(s) }))
      const collected = rows.reduce((a, r) => a + r.collected, 0)
      const charges = rows.reduce((a, r) => a + (r.charge ?? 0), 0)
      return { rows, collected, charges, due: collected - charges }
    },
    setAmounts: async (storeId: string, id: string, a: { collected: number; charge: number }) =>
      repo.setAmounts(storeId, id, validate(amountsInput, a)),
    markPaid: (storeId: string, ids: string[]) => repo.markPaid(storeId, ids, now()),
    chargesSince: (storeId: string, since: Date) => repo.chargesSince(storeId, since),

    /** E2 (cron): ask the courier about parcels with no news for 30 minutes. */
    async sync(limit = 50) {
      const stale = await repo.staleShipments(new Date(now().getTime() - 30 * 60_000), limit)
      let failed = 0
      for (const s of stale) {
        try {
          const { api: courier } = await apiFor(s.storeId, s.accountId!)
          const raw = await courier.status(s.ref)
          await apply(s, raw, null, { polled: raw })
        } catch {
          failed++
        }
      }
      return { checked: stale.length, failed }
    },
  }
}
export type Courier = ReturnType<typeof createCourier>
