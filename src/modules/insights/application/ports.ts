import type { DayStats } from '../domain/insights'

export type Counters = Partial<Omit<DayStats, 'date'>>

export type InsightsRepo = {
  /** Stores the raw view and bumps the day's page views — and visitors on a visitor's first view that day. */
  recordView(storeId: string, date: string, visitor: string, path: string): Promise<void>
  bump(storeId: string, date: string, delta: Counters): Promise<void>
  days(storeId: string, from: string, to: string): Promise<DayStats[]>
  topProducts(
    storeId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<{ name: string; quantity: number; revenue: number }[]>
  /** Raw page views are kept 30 days at most (daily_stats keeps the counts). */
  purgeViews(before: Date): Promise<void>
}

export type OrderMoney = { revenue: number; cost: number }
