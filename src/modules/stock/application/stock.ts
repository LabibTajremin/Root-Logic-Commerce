import { z } from 'zod'
import { validate } from '@/modules/shared'
import type { StockRepo } from './ports'

const adjustment = z.object({
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, 'stock.zero_delta'),
  note: z.string().trim().min(2).max(200),
})

export const createStock = ({ repo }: { repo: StockRepo }) => ({
  async adjustStock(
    storeId: string,
    productId: string,
    input: { delta: number; note: string },
    actorId: string | null,
  ) {
    const d = validate(adjustment, input)
    return repo.adjust(storeId, productId, d.delta, d.note, actorId)
  },
  lowStock: (storeId: string) => repo.lowStock(storeId),
  history: (storeId: string, productId?: string) => repo.movements(storeId, productId),
})

export type Stock = ReturnType<typeof createStock>
