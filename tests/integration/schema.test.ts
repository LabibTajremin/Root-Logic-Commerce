import { describe, expect, it } from 'vitest'
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core'
import * as schema from '@/infrastructure/db/schema'
import { createTestDb } from '../fixtures/db'

const tables: PgTable[] = Object.values(schema).filter((v) => v instanceof PgTable)

describe('schema', () => {
  it('every foreign key points at a table of this schema', () => {
    const fks = tables.flatMap((t) => getTableConfig(t).foreignKeys)
    expect(fks.length).toBeGreaterThan(15)
    for (const fk of fks) expect(tables).toContain(fk.reference().foreignTable)
  })

  it('every tenant table carries store_id (multi-tenant by design)', () => {
    const global = [
      'stores',
      'users',
      'sessions',
      'accounts',
      'verifications',
      'product_media',
      'order_items',
      'order_events',
    ]
    for (const t of tables) {
      const cfg = getTableConfig(t)
      if (!global.includes(cfg.name))
        expect(
          cfg.columns.map((c) => c.name),
          cfg.name,
        ).toContain('storeId')
    }
  })

  it('migrations apply cleanly on a fresh database', async () => {
    const db = await createTestDb()
    const rows = await db.execute<{ n: number }>(
      `select count(*)::int as n from information_schema.tables where table_schema = 'public'`,
    )
    expect(rows.rows[0]!.n).toBe(tables.length)
  })
})
