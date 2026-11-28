import { and, asc, eq, ne } from 'drizzle-orm'
import type { PagesRepo } from '@/modules/pages'
import type { Db } from '../client'
import { pages } from '../schema'

const cols = {
  id: pages.id,
  slug: pages.slug,
  title: pages.title,
  body: pages.body,
  published: pages.published,
  inFooter: pages.inFooter,
  sortOrder: pages.sortOrder,
}

export const createPagesRepo = (db: Db): PagesRepo => ({
  list: (storeId) =>
    db
      .select(cols)
      .from(pages)
      .where(eq(pages.storeId, storeId))
      .orderBy(asc(pages.sortOrder), asc(pages.title)),
  insert: async (storeId, input) => {
    // New pages go last in the footer.
    const n = await db.$count(pages, eq(pages.storeId, storeId))
    const [row] = await db
      .insert(pages)
      .values({ storeId, ...input, sortOrder: n })
      .onConflictDoNothing()
      .returning(cols)
    return row ?? null
  },
  update: async (storeId, id, input) => {
    const clash = await db
      .select({ id: pages.id })
      .from(pages)
      .where(and(eq(pages.storeId, storeId), eq(pages.slug, input.slug), ne(pages.id, id)))
    if (clash.length > 0) return null
    const rows = await db
      .update(pages)
      .set({ ...input, updatedAt: new Date() })
      .where(and(eq(pages.storeId, storeId), eq(pages.id, id)))
      .returning({ id: pages.id })
    return rows.length > 0
  },
  remove: async (storeId, id) => {
    await db.delete(pages).where(and(eq(pages.storeId, storeId), eq(pages.id, id)))
  },
})
