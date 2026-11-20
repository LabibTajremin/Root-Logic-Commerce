import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stores } from '@/infrastructure/db/schema'
import type { createTestDb } from './db'

export const seedStore = async (db: Awaited<ReturnType<typeof createTestDb>>, slug = 'shop') =>
  (await db.insert(stores).values({ slug, name: slug }).returning())[0]!.id

/** Container config for tests: local media in a throwaway folder. */
export const testConfig = (
  over: { entitlements?: ('seoPro' | 'removeBranding')[]; notifyLogFile?: string } = {},
) => ({
  entitlements: [],
  storage: { driver: 'local' as const, quotaBytes: 10 * 1024 ** 2, minFreeDiskBytes: 1 },
  mediaDir: mkdtempSync(join(tmpdir(), 'rlc-media-')),
  ...over,
})
