import { describe, expect, it } from 'vitest'
import { createRateLimiter } from './rate-limit'

describe('rate limiter', () => {
  it('allows `limit` hits per key per window, then refuses until the window passes', () => {
    let t = 0
    const rl = createRateLimiter({ limit: 2, windowMs: 1000, now: () => t })
    rl.assert('a')
    rl.assert('a')
    expect(() => rl.assert('a')).toThrow('rate.limited')
    rl.assert('b')
    t = 1000
    rl.assert('a')
  })

  it('forgets old keys so memory stays bounded', () => {
    let t = 0
    const rl = createRateLimiter({ limit: 1, windowMs: 10, now: () => t })
    for (let i = 0; i < 5; i++) rl.assert(`k${i}`)
    expect(rl.size()).toBe(5)
    t = 20
    rl.assert('fresh')
    expect(rl.size()).toBe(1)
  })
})
