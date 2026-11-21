import { DomainError, validate } from '@/modules/shared'
import { bannerData } from '../domain/promotions'
import type { BannersRepo } from './ports'

export const createPromotions = ({ repo }: { repo: BannersRepo }) => {
  const found = (ok: boolean) => {
    if (!ok) throw new DomainError('banner.not_found')
  }
  return {
    list: (storeId: string) => repo.list(storeId),
    active: async (storeId: string) => (await repo.list(storeId)).filter((b) => b.active),
    create: async (storeId: string, input: unknown) =>
      repo.insert(storeId, validate(bannerData, input)),
    setActive: async (storeId: string, id: string, active: boolean) =>
      found(await repo.setActive(storeId, id, active)),
    remove: (storeId: string, id: string) => repo.remove(storeId, id),
    reorder: (storeId: string, ids: string[]) => repo.setOrder(storeId, ids),
  }
}

export type Promotions = ReturnType<typeof createPromotions>
