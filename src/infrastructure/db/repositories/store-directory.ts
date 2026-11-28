import { eq } from 'drizzle-orm'
import type { StoreDirectory } from '@/server/tenant'
import type { Db } from '../client'
import { storeDomains, stores } from '../schema'

const cols = { id: stores.id, slug: stores.slug, active: stores.active }

export const createStoreDirectory = (db: Db): StoreDirectory => ({
  findBySlug: async (slug) =>
    (await db.select(cols).from(stores).where(eq(stores.slug, slug)))[0] ?? null,
  findByHost: async (host) =>
    (
      await db
        .select(cols)
        .from(storeDomains)
        .innerJoin(stores, eq(stores.id, storeDomains.storeId))
        .where(eq(storeDomains.host, host))
    )[0] ?? null,
})
