import { drizzle } from 'drizzle-orm/postgres-js'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import postgres from 'postgres'
import * as schema from './schema'

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>

// Small pool: one Node process serves every store on a 1-CPU VPS.
export const createDb = (url: string): Db =>
  drizzle({ client: postgres(url, { max: 10 }), schema, casing: 'snake_case' })
