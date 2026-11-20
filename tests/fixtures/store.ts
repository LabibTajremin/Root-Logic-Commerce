import { stores } from '@/infrastructure/db/schema'
import type { createTestDb } from './db'

export const seedStore = async (db: Awaited<ReturnType<typeof createTestDb>>, slug = 'shop') =>
  (await db.insert(stores).values({ slug, name: slug }).returning())[0]!.id
