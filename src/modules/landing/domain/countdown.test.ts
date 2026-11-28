import { describe, expect, it } from 'vitest'
import { countdownText } from './countdown'

const labels = { left: 'Ends in', ended: 'Ended' }

describe('offer countdown (H5)', () => {
  it('shows hours, minutes and seconds, then the ended text', () => {
    expect(countdownText(((26 * 60 + 3) * 60 + 9) * 1000 + 500, labels)).toBe('Ends in 26:03:09')
    expect(countdownText(0, labels)).toBe('Ended')
    expect(countdownText(-1, labels)).toBe('Ended')
  })
})
