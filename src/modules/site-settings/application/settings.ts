import { DomainError, validate } from '@/modules/shared'
import { businessSchema, type Business } from '../domain/business'
import { layoutSchema, type Layout } from '../domain/layout'
import {
  baseDesign,
  designSchema,
  mergeDesign,
  type DeepPartial,
  type Design,
} from '../domain/design'

export type StoredSettings = {
  design: unknown
  business: unknown
  layout: unknown
  version: number
}
export type SettingsRepo = {
  get(storeId: string): Promise<StoredSettings | null>
  insert(storeId: string, s: { design: Design; business: Business }): Promise<void>
  /** Optimistic lock: returns the new version, or null if someone saved in between. */
  update(
    storeId: string,
    patch: { design?: Design; business?: Business; layout?: Layout },
    expectedVersion: number,
  ): Promise<number | null>
}

type Defaults = { design?: DeepPartial<Design>; storeName: string }

/** Logs a settings change (F3): which part, and its value before and after. */
export type SettingsAudit = (
  storeId: string,
  action: `settings.${'design' | 'business' | 'layout'}`,
  before: unknown,
  after: unknown,
) => Promise<void>

export const createSiteSettings = ({
  repo,
  audit,
}: {
  repo: SettingsRepo
  audit: SettingsAudit
}) => {
  // Stored JSON is re-validated on read so an older/partial row still yields a complete Design.
  const resolve = (stored: unknown, d: Defaults) =>
    designSchema.parse(
      mergeDesign(baseDesign, { brand: { name: d.storeName } }, d.design ?? {}, stored ?? {}),
    )

  const save = async (
    storeId: string,
    patch: { design?: Design; business?: Business; layout?: Layout },
    version: number,
  ) => {
    const before = await repo.get(storeId)
    const next = await repo.update(storeId, patch, version)
    if (next === null) throw new DomainError('settings.conflict')
    for (const [part, after] of Object.entries(patch) as [keyof typeof patch, unknown][])
      // A missing row makes `update` return null above, so `before` exists here.
      await audit(storeId, `settings.${part}`, before![part], after)
    return next
  }

  return {
    // Lazy defaults: first read seeds the row (config only seeds; admin overrides afterwards).
    async get(storeId: string, defaults: Defaults) {
      const row = await repo.get(storeId)
      if (!row) {
        const fresh = { design: resolve(undefined, defaults), business: businessSchema.parse({}) }
        await repo.insert(storeId, fresh)
        return { ...fresh, layout: null, version: 1 }
      }
      return {
        design: resolve(row.design, defaults),
        business: businessSchema.parse(row.business),
        // Raw: the sections registry owns section ids and falls back to its default layout.
        layout: row.layout,
        version: row.version,
      }
    },
    saveDesign: async (storeId: string, input: unknown, version: number) =>
      save(storeId, { design: validate(designSchema, input) }, version),
    saveBusiness: async (storeId: string, input: unknown, version: number) =>
      save(storeId, { business: validate(businessSchema, input) }, version),
    saveLayout: async (storeId: string, input: unknown, version: number) =>
      save(storeId, { layout: validate(layoutSchema, input) }, version),
  }
}

export type SiteSettings = ReturnType<typeof createSiteSettings>
