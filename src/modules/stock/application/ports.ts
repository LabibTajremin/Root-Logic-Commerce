export type LowStockItem = { id: string; name: string; stock: number; lowStockThreshold: number }
export type StockMovement = {
  productId: string
  delta: number
  reason: 'order_confirmed' | 'order_restocked' | 'manual'
  note: string | null
  orderId: string | null
  actorId: string | null
  createdAt: Date
}
export type StockRepo = {
  /** Atomic; never lets stock go below zero. Returns the new stock level. */
  adjust(
    storeId: string,
    productId: string,
    delta: number,
    note: string,
    actorId: string | null,
  ): Promise<number>
  lowStock(storeId: string): Promise<LowStockItem[]>
  movements(storeId: string, productId?: string, limit?: number): Promise<StockMovement[]>
}
