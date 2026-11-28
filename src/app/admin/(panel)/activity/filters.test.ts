import { describe, expect, it } from 'vitest'
import { actorName, chipHref, toFilter } from './filters'

describe('activity filters', () => {
  it('parses the query string into a filter with Dhaka day bounds', () => {
    expect(toFilter({})).toEqual({})
    expect(
      toFilter({
        action: 'settings.design',
        actor: 'u1',
        q: 'x',
        from: '2026-11-01',
        to: '2026-11-02',
      }),
    ).toEqual({
      action: 'settings.design',
      actorId: 'u1',
      q: 'x',
      from: new Date('2026-10-31T18:00:00Z'),
      to: new Date('2026-11-02T17:59:59Z'),
    })
  })

  it('chip links keep other filters and swap the action', () => {
    expect(chipHref({ action: 'a', q: 'x', actor: '' }, 'b')).toBe('/admin/activity?q=x&action=b')
    expect(chipHref({ action: 'a', q: 'x' })).toBe('/admin/activity?q=x')
  })

  it('names the actor, or falls back', () => {
    const names = new Map([['u1', 'Rashed']])
    expect(actorName(names, 'u1', 'System')).toBe('Rashed')
    expect(actorName(names, 'gone', 'System')).toBe('System')
    expect(actorName(names, null, 'System')).toBe('System')
  })
})
