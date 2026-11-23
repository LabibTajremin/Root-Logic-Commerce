import { DomainError, validate } from '@/modules/shared'
import { couponInput, type Coupon, type CouponInput } from '../domain/coupons'

export type CouponWrite = Omit<Coupon, 'id' | 'used'>
export type CouponsRepo = {
  list(storeId: string): Promise<Coupon[]>
  /** Null when the code is already taken in this store. */
  insert(storeId: string, c: CouponWrite): Promise<Coupon | null>
  /** False when missing; null when the new code is taken. */
  update(storeId: string, id: string, c: CouponWrite): Promise<boolean | null>
  findByCode(storeId: string, code: string): Promise<Coupon | null>
  usedByPhone(couponId: string, phone: string): Promise<number>
}

/** C2: the owner's coupons; checkout reads them through `find` / `auto`. */
export const createCoupons = ({ repo }: { repo: CouponsRepo }) => {
  const taken = () => new DomainError('coupon.code_taken')
  return {
    list: (storeId: string) => repo.list(storeId),
    create: async (storeId: string, input: CouponInput) =>
      (await repo.insert(storeId, validate(couponInput, input))) ?? Promise.reject(taken()),
    async update(storeId: string, id: string, input: CouponInput) {
      const ok = await repo.update(storeId, id, validate(couponInput, input))
      if (ok === null) throw taken()
      if (!ok) throw new DomainError('coupon.not_found')
    },
    find: (storeId: string, code: string) => repo.findByCode(storeId, code.trim().toUpperCase()),
    /** Active coupons the owner marked "apply automatically". */
    auto: async (storeId: string) =>
      (await repo.list(storeId)).filter((c) => c.autoApply && c.active),
    usedByPhone: (couponId: string, phone: string) => repo.usedByPhone(couponId, phone),
  }
}

export type Coupons = ReturnType<typeof createCoupons>
