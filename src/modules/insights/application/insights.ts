import { dhakaDate, resolveRange, series, summarize, type RangeKey } from '../domain/insights'
import type { Counters, InsightsRepo, OrderMoney } from './ports'

type Deps = {
  repo: InsightsRepo
  /** Keyed hash (server secret): visitor ids can't be reversed or compared across days. */
  hash: (s: string) => string
  money: (storeId: string, orderId: string) => Promise<OrderMoney | null>
  now: () => Date
}
type Status =
  'placed' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'returned'

const BOT = /bot|crawl|spider|slurp|preview|headless(?!chrome)/i
const COUNTER: Partial<Record<Status, keyof Counters>> = {
  placed: 'ordersPlaced',
  confirmed: 'ordersConfirmed',
  delivered: 'ordersDelivered',
  cancelled: 'ordersCancelled',
  returned: 'ordersReturned',
}

export const createInsights = ({ repo, hash, money, now }: Deps) => ({
  /** Cookieless: a visitor is hash(store + ip + user agent + day); nothing is stored on the device. */
  async track(storeId: string, v: { ip: string; ua: string; path: string }) {
    if (BOT.test(v.ua) || /^\/(admin|api)(\/|$)/.test(v.path)) return
    const date = dhakaDate(now())
    await repo.recordView(storeId, date, hash(`${storeId}:${v.ip}:${v.ua}:${date}`), v.path)
  },

  async onOrderEvent(status: Status, e: { storeId: string; orderId: string }) {
    const field = COUNTER[status]
    if (!field) return
    const date = dhakaDate(now())
    // Revenue is counted when cash is collected (COD → delivered) and reversed on a return.
    const sign = { delivered: 1, returned: -1 }[status as 'delivered' | 'returned']
    if (!sign) return repo.bump(e.storeId, date, { [field]: 1 })
    const m = await money(e.storeId, e.orderId)
    if (m)
      await repo.bump(e.storeId, date, {
        [field]: 1,
        revenue: sign * m.revenue,
        cost: sign * m.cost,
      })
  },

  async report(
    storeId: string,
    key: RangeKey,
    custom: { from?: string; to?: string; group?: string } = {},
  ) {
    const range = resolveRange(key, now(), custom)
    const start = new Date(`${range.from}T00:00:00+06:00`)
    const end = new Date(Date.parse(`${range.to}T00:00:00+06:00`) + 86_400_000)
    const [rows, top] = await Promise.all([
      repo.days(storeId, range.from, range.to),
      repo.topProducts(storeId, start, end, 5),
    ])
    return { range, summary: summarize(rows), series: series(rows, range), top }
  },

  purge: () => repo.purgeViews(new Date(now().getTime() - 30 * 86_400_000)),
})

export type Insights = ReturnType<typeof createInsights>
