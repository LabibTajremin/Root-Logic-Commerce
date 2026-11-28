import { describe, expect, it } from 'vitest'
import { checkReturn, returnInput } from './returns'

const item = '00000000-0000-4000-8000-000000000001'
const order = { total: 50000, items: [{ id: item, quantity: 2 }] }

describe('returns (C14)', () => {
  it('applies defaults', () => {
    expect(
      returnInput.parse({ kind: 'return', reason: 'size', items: [{ itemId: item, quantity: 1 }] }),
    ).toMatchObject({ note: '', refund: 0, restock: false, exchangeOrderNo: null })
    expect(returnInput.safeParse({ kind: 'return', reason: 'size', items: [] }).success).toBe(false)
  })

  it('caps the quantities and refunds across earlier returns', () => {
    const one = { items: [{ itemId: item, quantity: 1 }], refund: 20000 }
    expect(() => checkReturn(order, [], one)).not.toThrow()
    expect(() => checkReturn(order, [one], one)).not.toThrow()
    expect(() => checkReturn(order, [one, one], one)).toThrow('return.too_many')
    expect(() =>
      checkReturn(order, [], { items: [{ itemId: 'other', quantity: 1 }], refund: 0 }),
    ).toThrow('return.too_many')
    expect(() => checkReturn(order, [one, one], { items: [], refund: 10001 })).toThrow(
      'return.refund_too_big',
    )
  })
})
