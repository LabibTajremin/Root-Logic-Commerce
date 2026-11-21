import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { DomainError } from '@/modules/shared'
import type { StockRepo } from '@/modules/stock'
import type { Db } from '../client'
import { products, stockMovements } from '../schema'

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
type Move = { productId: string; quantity: number }

// Conditional UPDATE is the oversell guard: two confirms racing for the last unit
// cannot both succeed, because the second sees stock < quantity and matches no row.
export const applyStock = async (
  tx: Tx,
  storeId: string,
  moves: Move[],
  sign: 1 | -1,
  meta: {
    reason: 'order_confirmed' | 'order_restocked' | 'manual'
    orderId?: string | null
    note?: string | null
    actorId: string | null
  },
) => {
  const levels: number[] = []
  for (const m of moves) {
    const delta = sign * m.quantity
    const [row] = await tx
      .update(products)
      .set({ stock: sql`${products.stock} + ${delta}` })
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.id, m.productId),
          gte(products.stock, -delta),
        ),
      )
      .returning({ stock: products.stock })
    if (!row) throw new DomainError('stock.insufficient', { productId: m.productId })
    await tx.insert(stockMovements).values({ storeId, productId: m.productId, delta, ...meta })
    levels.push(row.stock)
  }
  return levels
}

export const createStockRepo = (db: Db): StockRepo => ({
  adjust: (storeId, productId, delta, note, actorId) =>
    db.transaction(async (tx) => {
      const [p] = await tx
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products.id, productId)))
      if (!p) throw new DomainError('product.not_found')
      const [level] = await applyStock(
        tx,
        storeId,
        [{ productId, quantity: Math.abs(delta) }],
        delta > 0 ? 1 : -1,
        {
          reason: 'manual',
          note,
          actorId,
        },
      )
      return level!
    }),
  lowStock: (storeId) =>
    db
      .select({
        id: products.id,
        name: products.name,
        stock: products.stock,
        lowStockThreshold: products.lowStockThreshold,
      })
      .from(products)
      .where(
        and(
          eq(products.storeId, storeId),
          eq(products.status, 'active'),
          lte(products.stock, products.lowStockThreshold),
        ),
      )
      .orderBy(products.stock),
  movements: (storeId, productId, limit = 50) =>
    db
      .select({
        productId: stockMovements.productId,
        delta: stockMovements.delta,
        reason: stockMovements.reason,
        note: stockMovements.note,
        orderId: stockMovements.orderId,
        actorId: stockMovements.actorId,
        createdAt: stockMovements.createdAt,
      })
      .from(stockMovements)
      .where(
        and(
          eq(stockMovements.storeId, storeId),
          ...(productId ? [eq(stockMovements.productId, productId)] : []),
        ),
      )
      .orderBy(desc(stockMovements.createdAt))
      .limit(limit),
})
