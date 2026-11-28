import { validate } from '@/modules/shared'
import { checkReel, reelInput, type ReelData } from '../domain/reels'

export type Reel = ReelData & { id: string; sortOrder: number }

export type ReelsRepo = {
  /** In the owner's order. */
  list(storeId: string): Promise<Reel[]>
  insert(storeId: string, reel: ReelData): Promise<string>
  remove(storeId: string, id: string): Promise<void>
  setOrder(storeId: string, ids: string[]): Promise<void>
}

/** B4: the shop's reels — add, remove, move; shoppers see them in this order. */
export const createReels = ({ repo }: { repo: ReelsRepo }) => ({
  list: (storeId: string) => repo.list(storeId),
  /** Reels showing this product (product page, landing page). */
  forProduct: async (storeId: string, productId: string) =>
    (await repo.list(storeId)).filter((r) => r.productIds.includes(productId)),
  async add(storeId: string, input: unknown) {
    const reel = validate(reelInput, input)
    checkReel(reel)
    return repo.insert(storeId, reel)
  },
  remove: (storeId: string, id: string) => repo.remove(storeId, id),
  /** One place up (-1) or down (+1); the ends stay put. */
  async move(storeId: string, id: string, dir: -1 | 1) {
    const ids = (await repo.list(storeId)).map((r) => r.id)
    const i = ids.indexOf(id)
    const to = i + dir
    if (i < 0 || to < 0 || to >= ids.length) return
    ;[ids[i], ids[to]] = [ids[to]!, ids[i]!]
    await repo.setOrder(storeId, ids)
  },
})

export type Reels = ReturnType<typeof createReels>
