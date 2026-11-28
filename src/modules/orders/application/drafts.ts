import { DomainError, validate } from '@/modules/shared'
import type { CheckoutInput } from '../domain/checkout'
import {
  draftCheckout,
  draftInput,
  draftMaxAgeDays,
  type DraftData,
  type DraftInput,
} from '../domain/drafts'

export type Draft = DraftData & { id: string; updatedAt: Date }

export type DraftsRepo = {
  upsert(storeId: string, d: DraftData): Promise<void>
  list(storeId: string, since: Date): Promise<Draft[]>
  get(storeId: string, id: string, since: Date): Promise<Draft | null>
  remove(storeId: string, by: { id: string } | { phone: string }): Promise<void>
  purge(before: Date): Promise<void>
}

/** C1: what a shopper typed at checkout before ordering. Not an order: no number, stock or revenue. */
export const createDrafts = ({
  repo,
  allow,
  now = () => new Date(),
}: {
  repo: DraftsRepo
  /** Rate limit per store + client (a draft is saved as the shopper types). */
  allow: (key: string) => boolean
  now?: () => Date
}) => {
  const cutoff = () => new Date(now().getTime() - draftMaxAgeDays * 86_400_000)
  return {
    /** Quiet by design: a bad or too-frequent save is just skipped (the shopper is still typing). */
    async save(storeId: string, client: string, input: DraftInput) {
      const d = draftInput.safeParse(input)
      if (!d.success || !allow(`${storeId}:${client}`)) return false
      await repo.upsert(storeId, d.data)
      return true
    },
    list: (storeId: string) => repo.list(storeId, cutoff()),
    get: (storeId: string, id: string) => repo.get(storeId, id, cutoff()),
    discard: (storeId: string, id: string) => repo.remove(storeId, { id }),
    /** The shopper ordered after all. */
    ordered: async (storeId: string, phone: string) =>
      repo.remove(storeId, { phone: validate(draftInput.shape.phone, phone) }),
    purge: () => repo.purge(cutoff()),
    /** Places the draft as an order (with the shop's rules, via `place`) and drops it. */
    async convert<O>(storeId: string, id: string, place: (input: CheckoutInput) => Promise<O>) {
      const d = await repo.get(storeId, id, cutoff())
      if (!d) throw new DomainError('draft.not_found')
      const order = await place(draftCheckout(d))
      await repo.remove(storeId, { id })
      return order
    },
  }
}

export type Drafts = ReturnType<typeof createDrafts>
