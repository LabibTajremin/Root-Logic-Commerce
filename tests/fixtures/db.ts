import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '@/infrastructure/db/schema'

// Real Postgres (WASM) per test file — no Docker; migrations are the same ones production runs.
export const createTestDb = async () => {
  const db = drizzle({ client: new PGlite(), schema, casing: 'snake_case' })
  await migrate(db, { migrationsFolder: 'src/infrastructure/db/migrations' })
  return db
}
