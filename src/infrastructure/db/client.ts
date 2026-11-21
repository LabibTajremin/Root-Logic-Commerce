import { drizzle } from 'drizzle-orm/postgres-js'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import { mkdirSync } from 'node:fs'
import postgres from 'postgres'
import * as schema from './schema'

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

const MIGRATIONS = 'src/infrastructure/db/migrations'

// Small pool: one Node process serves every store on a 1-CPU VPS.
export const createDb = (url: string): Db =>
  drizzle({ client: postgres(url, { max: 10 }), schema, casing: 'snake_case' })

/**
 * `pglite:<dir>` runs real Postgres in-process (WASM) for local dev and e2e — no Docker.
 * Migrations are applied on open so the database always matches the schema.
 */
export const openDb = async (url: string): Promise<Db> => {
  if (!url.startsWith('pglite:')) return createDb(url)
  const [{ PGlite }, { drizzle: pglite }, { migrate }] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('drizzle-orm/pglite/migrator'),
  ])
  const dir = url.slice('pglite:'.length)
  if (dir !== 'memory') mkdirSync(dir, { recursive: true })
  const db = pglite({
    client: new PGlite(dir === 'memory' ? undefined : dir),
    schema,
    casing: 'snake_case',
  })
  await migrate(db, { migrationsFolder: MIGRATIONS })
  return db
}
