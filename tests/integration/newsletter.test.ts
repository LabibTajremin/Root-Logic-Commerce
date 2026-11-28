import { describe, expect, it } from 'vitest'
import { createContainer } from '@/server/container'
import { createTestDb } from '../fixtures/db'
import { seedStore, testConfig } from '../fixtures/store'

describe('newsletter (B13)', () => {
  it('keeps one sign-up per contact per store and exports them', async () => {
    const db = await createTestDb()
    const c = createContainer({ config: testConfig(), db, onEventError: () => {} })
    const [a, b] = [await seedStore(db), await seedStore(db, 'other')]
    await c.newsletter.subscribe(a, '01712345678', true)
    await c.newsletter.subscribe(a, '+8801712345678', true)
    await c.newsletter.subscribe(a, 'rahim@mail.com', true)
    await c.newsletter.subscribe(b, 'rahim@mail.com', true)
    await expect(c.newsletter.subscribe(a, 'x@y.z', false)).rejects.toThrow('newsletter.consent')
    expect((await c.newsletter.list(a)).map((s) => s.contact).sort()).toEqual([
      '01712345678',
      'rahim@mail.com',
    ])
    const csv = (await c.newsletter.csv(a)).split('\r\n')
    expect(csv[0]).toBe('contact,kind,joined')
    expect(csv).toHaveLength(3)
    expect(csv.join()).toContain('01712345678,phone,')
  })
})
