import { z } from 'zod'
import { entitlementIds } from '@/modules/plans'

const GB = 1024 ** 3

const storageDriver = z.enum(['local', 's3', 'gdrive'])

const storeConfigSchema = z.object({
  store: z.object({
    name: z.string().min(1),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'use lowercase letters, numbers and dashes'),
    theme: z.string().min(1).default('minimal'),
    locale: z.enum(['en', 'bn']).default('en'),
    currency: z.literal('BDT').default('BDT'),
  }),
  toggles: z
    .object({ otpEmail: z.boolean().default(false), otpSms: z.boolean().default(false) })
    .prefault({}),
  channels: z
    .object({
      email: z.boolean().default(false),
      sms: z.boolean().default(false),
      whatsapp: z.boolean().default(false),
    })
    .prefault({}),
  storage: z
    .object({
      driver: storageDriver.default('local'),
      quotaBytes: z
        .number()
        .int()
        .positive()
        .default(2 * GB),
      minFreeDiskBytes: z
        .number()
        .int()
        .positive()
        .default(2 * GB),
    })
    .prefault({}),
  entitlements: z.array(z.enum(entitlementIds)).default([]),
  rootLogicLab: z.object({ whatsapp: z.string().min(1) }),
})

const envSchema = z.object({
  DATABASE_URL: z
    .string()
    .regex(/^(postgres(ql)?:\/\/|pglite:)/, 'expected postgres:// or pglite:<dir>'),
  AUTH_SECRET: z.string().min(32),
  HOSTING_PROFILE: z.enum(['vercel', 'vps']).default('vps'),
  STORE_MODE: z.enum(['single', 'multi']).default('single'),
  DEFAULT_STORE_SLUG: z.string().min(1).optional(),
  STORAGE_DRIVER: storageDriver.optional(),
  SETTINGS_KEY: z.string().min(32).optional(),
})

export type StoreConfigInput = z.input<typeof storeConfigSchema>
export type AppConfig = ReturnType<typeof loadConfig>

export class ConfigError extends Error {
  override name = 'ConfigError'
}

export const defineStoreConfig = (config: StoreConfigInput) => config

const issues = (source: string, error: z.ZodError) =>
  error.issues.map((i) => `  • ${source} ${i.path.join('.')}: ${i.message}`)

// Fail fast at boot with every problem listed, so an owner can fix config in one pass.
export const loadConfig = (env: Record<string, string | undefined>, file: unknown) => {
  const e = envSchema.safeParse(env)
  const f = storeConfigSchema.safeParse(file)
  if (!e.success || !f.success) {
    const lines = [
      ...(e.success ? [] : issues('env', e.error)),
      ...(f.success ? [] : issues('store.config.ts', f.error)),
    ]
    throw new ConfigError(`Invalid configuration:\n${lines.join('\n')}`)
  }
  const storage = { ...f.data.storage, driver: e.data.STORAGE_DRIVER ?? f.data.storage.driver }
  if (e.data.HOSTING_PROFILE === 'vercel' && storage.driver === 'local') {
    throw new ConfigError(
      'Local disk storage is not available on Vercel (no persistent disk). Set STORAGE_DRIVER=s3 or gdrive.',
    )
  }
  return {
    databaseUrl: e.data.DATABASE_URL,
    authSecret: e.data.AUTH_SECRET,
    settingsKey: e.data.SETTINGS_KEY,
    hostingProfile: e.data.HOSTING_PROFILE,
    storeMode: e.data.STORE_MODE,
    defaultStoreSlug: e.data.DEFAULT_STORE_SLUG ?? f.data.store.slug,
    store: f.data.store,
    toggles: f.data.toggles,
    channels: f.data.channels,
    storage,
    entitlements: f.data.entitlements,
    rootLogicLab: f.data.rootLogicLab,
  }
}
