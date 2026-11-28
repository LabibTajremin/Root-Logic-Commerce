import { describe, expect, it } from 'vitest'
import { code128, code128Patterns } from './code128'

describe('code128', () => {
  it('has 106 distinct 11-module symbols and a 13-module stop', () => {
    const sum = (p: string) => [...p].reduce((s, c) => s + Number(c), 0)
    expect(code128Patterns.length).toBe(107)
    expect(new Set(code128Patterns).size).toBe(107)
    expect(code128Patterns.slice(0, 106).every((p) => p.length === 6 && sum(p) === 11)).toBe(true)
    expect(sum(code128Patterns[106]!)).toBe(13)
  })

  it('encodes start B, the data, the mod-103 checksum and stop', () => {
    // "RLC-1001": start 104 + Σ value × position = 828 → 828 % 103 = 4.
    const w = code128('RLC-1001')
    expect(w.length).toBe((1 + 8 + 1) * 6 + 7)
    expect(w.slice(0, 6).join('')).toBe(code128Patterns[104])
    expect(w.slice(54, 60).join('')).toBe(code128Patterns[4])
    expect(w.slice(-7).join('')).toBe('2331112')
    expect(() => code128('ঢাকা')).toThrow('printable ASCII')
  })
})
