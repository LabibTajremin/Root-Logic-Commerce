import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const stores = pgTable('stores', {
  id: uuid().primaryKey().defaultRandom(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  active: boolean().notNull().default(true),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
})

export const storeDomains = pgTable(
  'store_domains',
  {
    id: uuid().primaryKey().defaultRandom(),
    storeId: uuid()
      .notNull()
      .references(() => stores.id, { onDelete: 'cascade' }),
    host: text().notNull().unique(),
    primary: boolean().notNull().default(false),
  },
  (t) => [index('store_domains_store_id_idx').on(t.storeId)],
)
