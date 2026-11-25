import { normalizeBdPhone } from '@/modules/customers'
import { DomainError, validate } from '@/modules/shared'
import {
  blockInput,
  type AttemptReason,
  type BlockInput,
  type BlockKind,
  type FraudRules,
  noHistory,
  scoreAction,
  successPct,
  type CourierHistory,
  type ScoreRule,
} from '../domain/fraud'

export type Client = { phone: string; ip: string; deviceId: string }
export type Block = { id: string; kind: BlockKind; value: string; note: string; createdAt: Date }
export type Attempt = Client & { reason: AttemptReason; createdAt: Date }

export type FraudRepo = {
  addBlock(storeId: string, b: { kind: BlockKind; value: string; note: string }): Promise<void>
  removeBlock(storeId: string, id: string): Promise<void>
  listBlocks(storeId: string): Promise<Block[]>
  isBlocked(storeId: string, c: Client): Promise<boolean>
  /** The most orders any one of the phone, IP or device placed since `since`. */
  recentOrders(storeId: string, c: Client, since: Date): Promise<number>
  /** An order from this phone since `since` sharing a product. */
  hasDuplicate(storeId: string, phone: string, productIds: string[], since: Date): Promise<boolean>
  logAttempt(storeId: string, a: Client & { reason: AttemptReason }): Promise<void>
  attempts(storeId: string, limit: number): Promise<Attempt[]>
  /** D2 (FraudCheckPort, own-history provider): finished courier deliveries per phone. */
  courierHistory(storeId: string, phones: string[]): Promise<Record<string, CourierHistory>>
  /** D5: phones with the most cancelled / returned orders. */
  riskyPhones(
    storeId: string,
    limit: number,
  ): Promise<{ phone: string; lost: number; total: number }[]>
}

const hours = (n: number) => n * 3_600_000

export const createFraud = ({
  repo,
  now = () => new Date(),
}: {
  repo: FraudRepo
  now?: () => Date
}) => {
  const refuse = async (storeId: string, c: Client, reason: AttemptReason) => {
    await repo.logAttempt(storeId, { ...c, reason })
    throw new DomainError(`order.${reason}`)
  }
  return {
    /** D2: each phone's courier record and success % (for order rows and the order page). */
    async scores(storeId: string, phones: string[]) {
      const h = await repo.courierHistory(storeId, [...new Set(phones)])
      return Object.fromEntries(
        phones.map((p) => {
          const x = h[p] ?? noHistory
          return [p, { ...x, pct: successPct(x) }]
        }),
      )
    },
    /** D2 at checkout: what the shop's score rule says for this phone (null = nothing). */
    async scoreCheck(storeId: string, phone: string, rule: ScoreRule) {
      const p = normalizeBdPhone(phone)
      if (rule.minPct === 0 || !p) return null
      return scoreAction((await repo.courierHistory(storeId, [p]))[p] ?? noHistory, rule)
    },
    block: async (storeId: string, input: BlockInput) =>
      repo.addBlock(storeId, validate(blockInput, input)),
    unblock: (storeId: string, id: string) => repo.removeBlock(storeId, id),
    listBlocks: (storeId: string) => repo.listBlocks(storeId),

    /** D3/D4/D1 before a web order: blocklist, per-window limit, then duplicates (if blocked). */
    async check(storeId: string, c: Client, productIds: string[], rules: FraudRules) {
      const t = now().getTime()
      if (await repo.isBlocked(storeId, c)) await refuse(storeId, c, 'blocked')
      const since = new Date(t - hours(rules.windowHours))
      if (rules.perWindow > 0 && (await repo.recentOrders(storeId, c, since)) >= rules.perWindow)
        await refuse(storeId, c, 'too_many')
      const dupSince = new Date(t - hours(rules.duplicateHours))
      if (
        rules.blockDuplicates &&
        (await repo.hasDuplicate(storeId, c.phone, productIds, dupSince))
      )
        await refuse(storeId, c, 'duplicate')
    },

    async report(storeId: string) {
      const [attempts, risky] = await Promise.all([
        repo.attempts(storeId, 50),
        repo.riskyPhones(storeId, 10),
      ])
      return { attempts, risky }
    },
  }
}

export type Fraud = ReturnType<typeof createFraud>
