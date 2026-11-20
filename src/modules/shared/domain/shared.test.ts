import { describe, expect, it, vi } from 'vitest'
import { createEventBus, daysAgo, DomainError, formatMoney, toBanglaDigits, toMinor } from '..'

describe('money', () => {
  it('converts taka to integer poisha', () => {
    expect(toMinor(349)).toBe(34900)
    expect(toMinor(0.1 + 0.2)).toBe(30)
  })
  it('rejects negative or non-finite amounts', () => {
    expect(() => toMinor(-1)).toThrow(DomainError)
    expect(() => toMinor(Number.NaN)).toThrow('money.invalid')
  })
  it('formats with the taka sign, lakh grouping and optional Bangla digits', () => {
    expect(formatMoney(24850000)).toBe('৳2,48,500')
    expect(formatMoney(34950)).toBe('৳349.50')
    expect(formatMoney(129000, { banglaDigits: true })).toBe('৳১,২৯০')
    expect(toBanglaDigits('01712')).toBe('০১৭১২')
  })
})

describe('DomainError', () => {
  it('carries a stable code and params', () => {
    const e = new DomainError('x.y', { a: 1 })
    expect([e.name, e.code, e.message, e.params]).toEqual(['DomainError', 'x.y', 'x.y', { a: 1 }])
    expect(new DomainError('z').params).toEqual({})
  })
})

describe('event bus', () => {
  it('runs subscribers in order and isolates failures', async () => {
    const onError = vi.fn()
    const bus = createEventBus<{ 'order.confirmed': { id: string }; other: null }>(onError)
    const seen: string[] = []
    bus.on('order.confirmed', (p) => void seen.push('a' + p.id))
    bus.on('order.confirmed', () => {
      throw new Error('boom')
    })
    bus.on('order.confirmed', async (p) => void seen.push('c' + p.id))
    await bus.emit('order.confirmed', { id: '1' })
    await bus.emit('other', null)
    expect(seen).toEqual(['a1', 'c1'])
    expect(onError).toHaveBeenCalledWith(expect.any(Error), 'order.confirmed')
  })
})

describe('daysAgo', () => {
  it('subtracts whole days', () => {
    expect(daysAgo(30, new Date('2026-11-30T00:00:00Z')).toISOString()).toBe(
      '2026-10-31T00:00:00.000Z',
    )
    expect(daysAgo(0).getTime()).toBeLessThanOrEqual(Date.now())
  })
})
