import { describe, expect, it } from 'vitest'
import { authorize, can, isAllowed, type Actor } from '..'

const owner: Actor = { id: 'o', role: 'OWNER', storeId: 's1' }
const staff: Actor = { id: 't', role: 'STAFF', storeId: 's1' }
const root: Actor = { id: 'r', role: 'SUPER_ADMIN', storeId: null }

describe('permissions', () => {
  it('staff handles products, orders and stock but not settings or users', () => {
    expect(can('STAFF', 'orders.manage')).toBe(true)
    expect(can('STAFF', 'settings.manage')).toBe(false)
    expect(can('OWNER', 'users.manage')).toBe(true)
    expect(can('OWNER', 'plans.manage')).toBe(false)
    expect(can('SUPER_ADMIN', 'plans.manage')).toBe(true)
  })
  it('never crosses tenants except for SUPER_ADMIN', () => {
    expect(isAllowed(owner, 'orders.manage', 's1')).toBe(true)
    expect(isAllowed(owner, 'orders.manage', 's2')).toBe(false)
    expect(isAllowed(root, 'plans.manage', 's2')).toBe(true)
  })
  it('authorize throws distinct codes for anonymous and forbidden', () => {
    expect(() => authorize(null, 'orders.manage', 's1')).toThrow('access.unauthenticated')
    expect(() => authorize(staff, 'settings.manage', 's1')).toThrow('access.denied')
    expect(authorize(staff, 'stock.manage', 's1')).toBe(staff)
  })
})
