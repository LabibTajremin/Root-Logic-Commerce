import { and, desc, eq, ne, sql } from 'drizzle-orm'
import { landingBlock, type Landing, type LandingRepo } from '@/modules/landing'
import type { Db } from '../client'
import { landingPages } from '../schema'

const cols = {
  id: landingPages.id,
  slug: landingPages.slug,
  title: landingPages.title,
  productId: landingPages.productId,
  design: landingPages.design,
  siteChrome: landingPages.siteChrome,
  hidden: landingPages.hidden,
  blocks: landingPages.blocks,
  visits: landingPages.visits,
  createdAt: landingPages.createdAt,
  // Qualified on purpose: inside the subquery a bare "id" would mean the order's own id.
  orders:
    sql<number>`(select count(*) from "orders" o where o."landing_id" = "landing_pages"."id")`.mapWith(
      Number,
    ),
}

// JSON keeps no Date: blocks are read back through their schema (the countdown's endsAt).
const read = (rows: Landing[]) =>
  rows.map((r) => ({ ...r, blocks: r.blocks.map((b) => landingBlock.parse(b)) }))

export const createLandingRepo = (db: Db): LandingRepo => {
  const select = () => db.select(cols).from(landingPages)
  const one = async (storeId: string, by: ReturnType<typeof eq>) =>
    read((await select().where(and(eq(landingPages.storeId, storeId), by))) as Landing[])[0] ?? null
  return {
    list: async (storeId) =>
      read(
        (await select()
          .where(eq(landingPages.storeId, storeId))
          .orderBy(desc(landingPages.createdAt))) as Landing[],
      ),
    bySlug: (storeId, slug) => one(storeId, eq(landingPages.slug, slug)),
    byId: (storeId, id) => one(storeId, eq(landingPages.id, id)),
    insert: async (storeId, page) => {
      const [row] = await db
        .insert(landingPages)
        .values({ storeId, ...page })
        .onConflictDoNothing()
        .returning({ id: landingPages.id })
      return row?.id ?? null
    },
    update: async (storeId, id, page) => {
      const clash = await db
        .select({ id: landingPages.id })
        .from(landingPages)
        .where(
          and(
            eq(landingPages.storeId, storeId),
            eq(landingPages.slug, page.slug),
            ne(landingPages.id, id),
          ),
        )
      if (clash.length > 0) return null
      const rows = await db
        .update(landingPages)
        .set({ ...page, updatedAt: new Date() })
        .where(and(eq(landingPages.storeId, storeId), eq(landingPages.id, id)))
        .returning({ id: landingPages.id })
      return rows.length > 0
    },
    remove: async (storeId, id) => {
      await db
        .delete(landingPages)
        .where(and(eq(landingPages.storeId, storeId), eq(landingPages.id, id)))
    },
    addVisit: async (storeId, id) => {
      await db
        .update(landingPages)
        .set({ visits: sql`${landingPages.visits} + 1` })
        .where(and(eq(landingPages.storeId, storeId), eq(landingPages.id, id)))
    },
  }
}
