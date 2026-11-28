import { parseEmbed } from '@/modules/promotions'
import type { storefront } from '../storefront'
import { ReelsCarousel } from './reels-carousel'

type Ctx = Awaited<ReturnType<typeof storefront>>

/** B4: the shop's reels (or one product's), while the reels module is on and there are some. */
export const Reels = async ({ ctx, productId }: { ctx: Ctx; productId?: string }) => {
  const { on, store, reels, catalog, money, priceOf, t } = ctx
  if (!on('reels')) return null
  const list = productId ? await reels.forProduct(store.id, productId) : await reels.list(store.id)
  if (list.length === 0) return null
  const products = new Map(
    (await catalog.listProducts(store.id, { status: 'active' }))
      .filter((p) => p.options.length === 0)
      .map((p) => [p.id, p]),
  )
  const views = list.map((r) => {
    const embed = r.url ? parseEmbed(r.url) : null
    return {
      id: r.id,
      caption: r.caption,
      cover: r.coverId ? `/api/media/${r.coverId}/640` : (embed?.thumb ?? null),
      video: r.videoId && `/api/media/${r.videoId}/0`,
      embed: embed?.src ?? null,
      // Only products that can be ordered as they are (active, no size or colour to pick).
      products: r.productIds.flatMap((id) => {
        const p = products.get(id)
        return p
          ? [
              {
                price: money(priceOf(p)),
                item: {
                  id: p.id,
                  productId: p.id,
                  variantId: null,
                  slug: p.slug,
                  name: p.name,
                  price: priceOf(p),
                },
              },
            ]
          : []
      }),
    }
  })
  return (
    <section
      aria-labelledby="reels-title"
      className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4"
    >
      <h2 id="reels-title" className="font-heading text-2xl">
        {t('reels.title')}
      </h2>
      <ReelsCarousel
        reels={views}
        labels={{
          play: t('reels.play'),
          reel: t('reels.reel'),
          prev: t('reels.prev'),
          next: t('reels.next'),
          close: t('common.close'),
          order: t('shop.orderNow'),
        }}
      />
    </section>
  )
}
