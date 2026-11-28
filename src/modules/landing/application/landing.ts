import { DomainError, validate } from '@/modules/shared'
import {
  copySlug,
  defaultBlocks,
  landingInput,
  packPrice,
  type LandingDesign,
} from '../domain/landing'
import type { Landing, LandingRepo, ProductFacts } from './ports'

export const createLanding = ({
  repo,
  product,
}: {
  repo: LandingRepo
  product: (storeId: string, id: string) => Promise<ProductFacts | null>
}) => {
  const taken = () => new DomainError('landing.slug_taken')
  const found = async (storeId: string, id: string) =>
    (await repo.byId(storeId, id)) ?? Promise.reject(new DomainError('landing.not_found'))
  const discount = (page: Landing, qty: number, unit: number) =>
    unit * qty - packPrice(page.blocks, qty, unit)
  const data = ({ id: _i, visits: _v, orders: _o, createdAt: _c, ...rest }: Landing) => rest
  return {
    list: (storeId: string) => repo.list(storeId),
    get: found,
    /** What shoppers may open: a page the owner has not hidden. */
    forShoppers: async (storeId: string, slug: string) => {
      const page = await repo.bySlug(storeId, slug)
      return page && !page.hidden ? page : null
    },
    /** H5: pick a product and a design, the page is filled from the product. */
    async create(
      storeId: string,
      input: { title: string; slug: string; productId: string; design: LandingDesign },
      locale: 'en' | 'bn',
    ) {
      const p = await product(storeId, input.productId)
      if (!p) throw new DomainError('product.not_found')
      const page = validate(landingInput, { ...input, blocks: defaultBlocks(p, locale) })
      return (await repo.insert(storeId, page)) ?? Promise.reject(taken())
    },
    async save(storeId: string, id: string, input: unknown) {
      const ok = await repo.update(storeId, id, validate(landingInput, input))
      if (ok === null) throw taken()
      if (!ok) throw new DomainError('landing.not_found')
    },
    async setHidden(storeId: string, id: string, hidden: boolean) {
      await repo.update(storeId, id, { ...data(await found(storeId, id)), hidden })
    },
    /** A hidden copy to edit, so the live page keeps running. */
    async copy(storeId: string, id: string) {
      const page = data(await found(storeId, id))
      const slugs = new Set((await repo.list(storeId)).map((p) => p.slug))
      const slug = copySlug(page.slug, slugs)
      return (await repo.insert(storeId, {
        ...page,
        slug,
        title: `${page.title} (copy)`,
        hidden: true,
      }))!
    },
    remove: (storeId: string, id: string) => repo.remove(storeId, id),
    visit: (storeId: string, id: string) => repo.addVisit(storeId, id),
    /** H5 packs: what the page takes off `qty` pieces at `unit` each. */
    discount,
    /**
     * H5 inline checkout: an order from a page is its one product, priced by the page's packs.
     * Anything else (a hidden page, other products) is refused rather than discounted.
     */
    async orderTerms(
      storeId: string,
      id: string,
      items: { productId: string; quantity: number }[],
    ) {
      const page = await repo.byId(storeId, id)
      const [line] = items
      if (!page || page.hidden || items.length !== 1 || line!.productId !== page.productId)
        throw new DomainError('landing.not_found')
      // The page goes with its product (cascade), so the product is always there.
      const p = (await product(storeId, page.productId))!
      return {
        source: 'landing' as const,
        landingId: page.id,
        discount: discount(page, line!.quantity, p.price),
      }
    },
  }
}

export type LandingService = ReturnType<typeof createLanding>
