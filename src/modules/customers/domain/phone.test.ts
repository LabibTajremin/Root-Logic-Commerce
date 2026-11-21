import { describe, expect, it } from 'vitest'
import { normalizeBdPhone } from './phone'

describe('normalizeBdPhone', () => {
  it.each([
    ['01712345678', '01712345678'],
    ['+8801712345678', '01712345678'],
    ['8801912-345-678', '01912345678'],
    ['017 1234 5678', '01712345678'],
  ])('%s → %s', (a, b) => expect(normalizeBdPhone(a)).toBe(b))
  it.each(['01212345678', '0171234567', '1712345678', 'abc'])('rejects %s', (a) =>
    expect(normalizeBdPhone(a)).toBeNull(),
  )
})
