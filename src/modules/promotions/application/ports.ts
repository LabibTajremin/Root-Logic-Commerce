import type { BannerData } from '../domain/promotions'

export type Banner = { id: string; data: BannerData; active: boolean; sortOrder: number }

export type BannersRepo = {
  list(storeId: string): Promise<Banner[]>
  insert(storeId: string, data: BannerData): Promise<Banner>
  update(
    storeId: string,
    id: string,
    patch: { data?: BannerData; active?: boolean },
  ): Promise<boolean>
  remove(storeId: string, id: string): Promise<void>
  setOrder(storeId: string, ids: string[]): Promise<void>
}
