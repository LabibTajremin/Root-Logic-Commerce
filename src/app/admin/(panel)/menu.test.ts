import { describe, expect, it } from 'vitest'
import { adminMenu, isAdminMode, menuGroups } from './menu'

describe('admin menu', () => {
  it('Simple shows the everyday screens; Pro shows every screen', () => {
    const hrefs = (m: ReturnType<typeof adminMenu>) => m.flatMap((g) => g.items.map((i) => i.href))
    expect(hrefs(adminMenu('simple'))).toEqual([
      '/admin',
      '/admin/orders',
      '/admin/products',
      '/admin/stock',
      '/admin/design',
      '/admin/messages',
      '/admin/help',
    ])
    expect(hrefs(adminMenu('pro'))).toEqual(menuGroups.flatMap((g) => g.items.map((i) => i.href)))
    expect(isAdminMode('pro')).toBe(true)
    expect(isAdminMode('x')).toBe(false)
  })
})
