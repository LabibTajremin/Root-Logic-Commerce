import { comboPercent } from '@/modules/deals'
import { ProductImage } from '@/ui/product-image'
import type { storefront } from '../storefront'
import { AddCombo } from './add-combo'

type Ctx = Awaited<ReturnType<typeof storefront>>

/** A9: the shop's combos that can be bought now (every item active, plain and in stock or not). */
export const ComboList = async ({ ctx, limit }: { ctx: Ctx; limit?: number }) => {
  const { business, catalog, store, imagesOf, money, priceOf, t } = ctx
  const combos = business.combos.filter((c) => c.on).slice(0, limit)
  const products = new Map(
    (await catalog.listProducts(store.id, { status: 'active' })).map((p) => [p.id, p]),
  )
  // A combo with an item that is gone (archived, deleted, now with options) is not shown.
  const ready = combos.filter((c) =>
    c.items.every((i) => products.get(i.productId)?.options.length === 0),
  )
  const images = await imagesOf(
    [...new Set(ready.flatMap((c) => c.items.map((i) => i.productId)))].map((id) =>
      products.get(id)!,
    ),
  )
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ready.map((c) => {
        const lines = c.items.map((i) => ({ ...i, p: products.get(i.productId)! }))
        const full = lines.reduce((n, l) => n + priceOf(l.p) * l.qty, 0)
        const pct = comboPercent(full, c.price)
        const sets = Math.min(...lines.map((l) => Math.floor(l.p.stock / l.qty)))
        return (
          <li
            key={c.id}
            data-testid={`combo-${c.slug}`}
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
          >
            <div className="flex gap-2">
              {lines.map((l) => {
                const img = images.get(l.productId)![0]
                return (
                  <div
                    key={l.productId}
                    className="relative aspect-square flex-1 overflow-hidden rounded-control bg-soft"
                  >
                    {img && <ProductImage image={img} sizes="120px" />}
                  </div>
                )
              })}
            </div>
            <h3 className="font-heading text-lg">{c.name}</h3>
            <ul className="text-sm text-muted">
              {lines.map((l) => (
                <li key={l.productId}>
                  {l.qty} × {l.p.name}
                </li>
              ))}
            </ul>
            <p className="flex items-baseline gap-2">
              <span className="text-xl font-semibold">{money(c.price)}</span>
              {pct > 0 && (
                <>
                  <s className="text-muted">{money(full)}</s>
                  <span className="text-sm font-semibold text-success">
                    {t('combos.less', { pct })}
                  </span>
                </>
              )}
            </p>
            <AddCombo
              disabled={sets === 0}
              label={sets === 0 ? t('shop.soldOut') : t('combos.add')}
              items={lines.map((l) => ({
                qty: l.qty,
                item: {
                  id: l.p.id,
                  productId: l.p.id,
                  variantId: null,
                  slug: l.p.slug,
                  name: l.p.name,
                  price: priceOf(l.p),
                },
              }))}
            />
          </li>
        )
      })}
    </ul>
  )
}
