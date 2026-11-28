import { describe, expect, it } from 'vitest'
import { rotateKeyframes } from './announcement-motion'

describe('announcement rotation (B1)', () => {
  it('gives each message an equal slice of the cycle', () => {
    expect(rotateKeyframes(4)).toBe(
      '@keyframes rlc-rotate-4{0%{opacity:0;transform:translateY(40%)}2.5%,21.25%{opacity:1;transform:none}25%,100%{opacity:0}}',
    )
    expect(rotateKeyframes(3)).toContain('3.33%,28.33%')
  })
})
