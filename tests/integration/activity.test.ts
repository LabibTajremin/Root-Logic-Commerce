import { describe, expect, it } from 'vitest'
import { createActivity } from '@/modules/activity'
import { createActivityRepo } from '@/infrastructure/db/repositories/activity-repo'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

describe('activity log (F3)', () => {
  it('records, filters, counts, undoes once and keeps 30 days', async () => {
    const db = await createTestDb()
    const [store, other] = [await seedStore(db), await seedStore(db, 'other')]
    let clock = new Date('2026-11-01T00:00:00Z')
    const log = createActivity({
      repo: createActivityRepo(db),
      now: () => clock,
      retentionDays: 30,
    })
    const entry = (action: string, actorId: string | null) => ({
      action,
      actorId,
      actorIp: '1.2.3.4',
      before: { a: 1 },
      after: { a: 2 },
    })
    await log.record(store, entry('settings.design', 'u1'))
    await log.record(store, entry('settings.business', 'u2'))
    await log.record(store, entry('order.cancel', null))
    await log.record(other, entry('settings.design', 'u9'))

    const all = await log.list(store, {})
    expect(all.rows).toHaveLength(3)
    expect(all.counts).toEqual([
      { action: 'order.cancel', n: 1 },
      { action: 'settings.business', n: 1 },
      { action: 'settings.design', n: 1 },
    ])
    expect((await log.list(store, { action: 'settings.design' })).rows).toHaveLength(1)
    expect((await log.list(store, { actorId: 'u2' })).rows[0]!.action).toBe('settings.business')
    expect((await log.list(store, { q: 'busi' })).rows).toHaveLength(1)
    const future = new Date('2030-01-01T00:00:00Z')
    expect((await log.list(store, { from: future })).rows).toHaveLength(0)
    expect((await log.list(store, { to: future })).rows).toHaveLength(3)

    const design = (await log.list(store, { action: 'settings.design' })).rows[0]!
    expect((await log.forUndo(store, design.id)).before).toEqual({ a: 1 })
    await log.markUndone(store, design.id)
    await expect(log.forUndo(store, design.id)).rejects.toThrow('activity.not_undoable')
    const cancel = (await log.list(store, { action: 'order.cancel' })).rows[0]!
    await expect(log.forUndo(store, cancel.id)).rejects.toThrow('activity.not_undoable')
    await expect(log.forUndo(other, design.id)).rejects.toThrow('activity.not_found')

    clock = new Date('2026-12-15T00:00:00Z')
    await log.record(store, entry('settings.layout', 'u1'))
    expect((await log.list(store, {})).rows.map((r) => r.action)).toEqual(['settings.layout'])
  })
})
