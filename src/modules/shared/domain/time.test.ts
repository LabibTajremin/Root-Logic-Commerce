import { describe, expect, it } from 'vitest'
import { daysAgo, timeAgo } from './time'

const now = new Date('2026-11-28T12:00:00Z')
const ago = (s: number) => new Date(now.getTime() - s * 1000)

describe('time', () => {
  it('counts days back', () => {
    expect(daysAgo(2, now).toISOString()).toBe('2026-11-26T12:00:00.000Z')
  })

  it('says how long ago, in the shopper’s language', () => {
    expect(timeAgo(ago(20), now, 'en')).toBe('20 seconds ago')
    expect(timeAgo(ago(5 * 60), now, 'en')).toBe('5 minutes ago')
    expect(timeAgo(ago(2 * 3600), now, 'en')).toBe('2 hours ago')
    expect(timeAgo(ago(3 * 86_400), now, 'en')).toBe('3 days ago')
    expect(timeAgo(ago(0), now, 'en')).toBe('now')
    expect(timeAgo(ago(-5), now, 'en')).toBe('now')
    expect(timeAgo(ago(2 * 3600), now, 'bn')).toContain('ঘণ্টা')
  })
})
