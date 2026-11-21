import { and, eq, sql } from 'drizzle-orm'
import type { SettingsRepo } from '@/modules/site-settings'
import type { Db } from '../client'
import { siteSettings } from '../schema'

export const createSettingsRepo = (db: Db): SettingsRepo => ({
  get: async (storeId) =>
    (
      await db
        .select({
          design: siteSettings.design,
          business: siteSettings.business,
          layout: siteSettings.layout,
          version: siteSettings.version,
        })
        .from(siteSettings)
        .where(eq(siteSettings.storeId, storeId))
    )[0] ?? null,
  insert: async (storeId, s) => {
    await db
      .insert(siteSettings)
      .values({ storeId, ...s })
      .onConflictDoNothing()
  },
  update: async (storeId, patch, expected) =>
    (
      await db
        .update(siteSettings)
        .set({ ...patch, version: sql`${siteSettings.version} + 1`, updatedAt: new Date() })
        .where(and(eq(siteSettings.storeId, storeId), eq(siteSettings.version, expected)))
        .returning({ v: siteSettings.version })
    )[0]?.v ?? null,
})
