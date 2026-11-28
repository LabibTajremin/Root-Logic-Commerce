import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { DomainError } from '@/modules/shared'
import type { StockRepo } from '@/modules/stock'
import type { Db } from '../client'
import { products, productVariants, stockMovements } from '../schema'

type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
type Move = { productId: string; variantId?: string | null; quantity: number }

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
    // A variant carries its own stock (guarded the same way); the product keeps the total.
    if (m.variantId) {
      const [v] = await tx
        .update(productVariants)
        .set({ stock: sql`${productVariants.stock} + ${delta}` })
        .where(
          and(
            eq(productVariants.storeId, storeId),
            eq(productVariants.id, m.variantId),
            gte(productVariants.stock, -delta),
          ),
        )
        .returning({ id: productVariants.id })
      if (!v) throw new DomainError('stock.insufficient', { productId: m.productId })
    }
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
    await tx.insert(stockMovements).values({
      storeId,
      productId: m.productId,
      variantId: m.variantId ?? null,
      delta,
      ...meta,
    })
    levels.push(row.stock)
  }
  return levels
}

export const createStockRepo = (db: Db): StockRepo => ({
  adjust: (storeId, productId, delta, note, actorId) =>
    db.transaction(async (tx) => {
      const [p] = await tx
        .select({ options: products.options })
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products.id, productId)))
      if (!p) throw new DomainError('product.not_found')
      // Variant stock is set per variant on the product page; a product-level change would break the total.
      if (p.options.length > 0) throw new DomainError('stock.has_variants')
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
