import { describe, expect, it } from 'vitest'
import { ConfigError, defineStoreConfig, loadConfig } from './config'

const env = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/rlc',
  AUTH_SECRET: 'x'.repeat(32),
}
const file = defineStoreConfig({
  store: { name: 'Dokan', slug: 'dokan' },
  rootLogicLab: { whatsapp: '+8801700000000' },
})

describe('loadConfig', () => {
  it('applies defaults when only required values are given', () => {
    const c = loadConfig(env, file)
    expect(c.hostingProfile).toBe('vps')
    expect(c.storeMode).toBe('single')
    expect(c.defaultStoreSlug).toBe('dokan')
    expect(c.store).toMatchObject({ theme: 'minimal', locale: 'en', currency: 'BDT' })
    expect(c.toggles).toEqual({ otpEmail: false, otpSms: false })
    expect(c.channels).toEqual({ email: false, sms: false, whatsapp: false })
    expect(c.storage).toEqual({
      driver: 'local',
      quotaBytes: 2 * 1024 ** 3,
      videoMaxBytes: 20 * 1024 ** 2,
      minFreeDiskBytes: 2 * 1024 ** 3,
    })
    expect(c.entitlements).toEqual([])
    expect(c.settingsKey).toBeUndefined()
  })

  it('lets env override the config file (precedence: defaults < file < env)', () => {
    const c = loadConfig(
      {
        ...env,
        HOSTING_PROFILE: 'vercel',
        STORE_MODE: 'multi',
        DEFAULT_STORE_SLUG: 'other',
        STORAGE_DRIVER: 's3',
        SETTINGS_KEY: 'k'.repeat(32),
      },
      { ...file, storage: { driver: 'gdrive' }, entitlements: ['removeBranding'] },
    )
    expect(c).toMatchObject({
      hostingProfile: 'vercel',
      storeMode: 'multi',
      defaultStoreSlug: 'other',
      settingsKey: 'k'.repeat(32),
    })
    expect(c.storage.driver).toBe('s3')
    expect(c.entitlements).toEqual(['removeBranding'])
  })

  it('rejects local storage on the vercel profile with a readable message', () => {
    expect(() => loadConfig({ ...env, HOSTING_PROFILE: 'vercel' }, file)).toThrow(
      /Local disk storage is not available on Vercel/,
    )
  })

  it('lists every invalid env and file value in one error', () => {
    let error: unknown
    try {
      loadConfig({ AUTH_SECRET: 'short' }, { store: { name: '', slug: 'Bad Slug' } })
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(ConfigError)
    const msg = (error as Error).message
    expect(msg).toContain('env DATABASE_URL')
    expect(msg).toContain('env AUTH_SECRET')
    expect(msg).toContain('store.config.ts store.name')
    expect(msg).toContain('store.config.ts store.slug')
    expect(msg).toContain('store.config.ts rootLogicLab')
  })
  it('reports only env problems when the file is valid, and vice versa', () => {
    expect(() => loadConfig({}, file)).toThrow(/^Invalid configuration:\n {2}• env DATABASE_URL/)
    expect(() => loadConfig(env, {})).toThrow(
      /^Invalid configuration:\n {2}• store\.config\.ts store/,
    )
  })
})
