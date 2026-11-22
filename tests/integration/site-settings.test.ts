import { describe, expect, it } from 'vitest'
import { eq } from 'drizzle-orm'
import { baseDesign, createSiteSettings } from '@/modules/site-settings'
import { createSettingsRepo } from '@/infrastructure/db/repositories/settings-repo'
import { siteSettings } from '@/infrastructure/db/schema'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

describe('site settings', () => {
  it('seeds lazily from theme defaults, saves with a version lock, re-validates stored JSON', async () => {
    const db = await createTestDb()
    const store = await seedStore(db)
    const audited: string[] = []
    const settings = createSiteSettings({
      repo: createSettingsRepo(db),
      audit: async (_s, action) => void audited.push(action),
    })
    const defaults = {
      storeName: 'Ankito',
      design: { themeId: 'ankito', colors: { accent: '#A8763E' } },
    }

    const first = await settings.get(store, defaults)
    expect(first.version).toBe(1)
    expect(first.design).toMatchObject({
      themeId: 'ankito',
      brand: { name: 'Ankito' },
      colors: { accent: '#A8763E' },
    })
    expect(first.business.deliveryZones).toHaveLength(2)

    const v2 = await settings.saveDesign(
      store,
      { ...first.design, colors: { ...first.design.colors, button: '#3C6430' } },
      1,
    )
    expect(v2).toBe(2)
    await expect(settings.saveDesign(store, first.design, 1)).rejects.toThrow('settings.conflict')
    await expect(
      settings.saveDesign(store, { ...baseDesign, colors: { accent: 'nope' } }, 2),
    ).rejects.toMatchObject({ code: 'validation' })
    expect(await settings.saveBusiness(store, { banglaDigits: true }, 2)).toBe(3)

    await db
      .update(siteSettings)
      .set({ design: { colors: { header: '#000000' } } })
      .where(eq(siteSettings.storeId, store))
    const again = await settings.get(store, defaults)
    expect(again).toMatchObject({
      version: 3,
      business: { banglaDigits: true },
      design: { themeId: 'ankito', colors: { header: '#000000', accent: '#A8763E' } },
    })
    expect(again.layout).toBeNull()
    const layout = {
      preset: 'general',
      home: [{ sectionId: 'hero', enabled: true, settings: {} }],
    }
    expect(await settings.saveLayout(store, layout, 3)).toBe(4)
    expect((await settings.get(store, defaults)).layout).toEqual(layout)
    await expect(
      settings.saveLayout(store, { preset: 'Bad Id', home: [] }, 4),
    ).rejects.toMatchObject({ code: 'validation' })

    expect(audited).toEqual(['settings.design', 'settings.business', 'settings.layout'])
    expect(
      (await settings.get(await seedStore(db, 'plain'), { storeName: 'Plain' })).design.themeId,
    ).toBe('minimal')
  })
})
