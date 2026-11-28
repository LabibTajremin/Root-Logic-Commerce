import { describe, expect, it } from 'vitest'
import { bdDistricts, detectDistrict, detectZone } from './districts'

const rule = { mode: 'text' as const, districtZones: { Dhaka: 'in' }, otherZone: 'out' }

describe('districts', () => {
  it('lists all 64 districts once', () => {
    expect(bdDistricts.length).toBe(64)
    expect(new Set(bdDistricts.map((d) => d.en)).size).toBe(64)
  })

  it('finds the district in Latin, older spellings and Bangla; the last one wins', () => {
    expect(detectDistrict('House 1, Mirpur, DHAKA')).toBe('Dhaka')
    expect(detectDistrict('Agrabad, Chittagong')).toBe('Chattogram')
    expect(detectDistrict("near Cox's Bazar beach")).toBe("Cox's Bazar")
    expect(detectDistrict('বাসা ৫, সিলেট')).toBe('Sylhet')
    expect(detectDistrict('Feni road, Dhaka')).toBe('Dhaka')
    expect(detectDistrict('Fenix tower')).toBeNull()
    expect(detectDistrict('')).toBeNull()
  })

  it('maps the district to a zone the shop has', () => {
    expect(detectZone('Dhaka', rule, ['in', 'out'])).toBe('in')
    expect(detectZone('Khulna', rule, ['in', 'out'])).toBe('out')
    expect(detectZone('Khulna', { ...rule, otherZone: '' }, ['in', 'out'])).toBeNull()
    expect(detectZone('Somewhere', rule, ['in', 'out'])).toBeNull()
    expect(detectZone('Dhaka', rule, ['out'])).toBeNull()
  })
})
