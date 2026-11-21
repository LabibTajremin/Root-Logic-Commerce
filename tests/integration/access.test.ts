import { describe, expect, it } from 'vitest'
import { createAccess } from '@/modules/access'
import { createUsersRepo } from '@/infrastructure/db/repositories/users-repo'
import { users } from '@/infrastructure/db/schema'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

describe('access', () => {
  it('owners list and re-role their own store users only', async () => {
    const db = await createTestDb()
    const s1 = await seedStore(db)
    const s2 = await seedStore(db, 'two')
    await db.insert(users).values([
      { id: 'o', name: 'Rahim', email: 'o@x.bd', role: 'OWNER', storeId: s1 },
      { id: 't', name: 'Karim', email: 't@x.bd', role: 'STAFF', storeId: s1 },
      { id: 'x', name: 'Other', email: 'x@x.bd', role: 'STAFF', storeId: s2 },
    ])
    const access = createAccess({ repo: createUsersRepo(db), hash: async (p) => `h:${p}` })
    const owner = { id: 'o', role: 'OWNER' as const, storeId: s1 }
    expect((await access.listUsers(owner, s1)).map((u) => u.name)).toEqual(['Karim', 'Rahim'])
    await access.setRole(owner, s1, 't', 'OWNER')
    expect((await access.listUsers(owner, s1)).find((u) => u.id === 't')?.role).toBe('OWNER')
    await expect(access.setRole(owner, s1, 'x', 'OWNER')).rejects.toThrow('access.user_not_found')
    await expect(access.setRole(owner, s1, 'o', 'STAFF')).rejects.toThrow('access.self_role_change')
    await expect(access.listUsers(owner, s2)).rejects.toThrow('access.denied')
    await access.inviteUser(owner, s1, {
      name: 'Shirin',
      email: 'Shirin@X.bd',
      password: 'longenough',
      role: 'STAFF',
    })
    expect(
      (await access.listUsers(owner, s1)).find((u) => u.email === 'shirin@x.bd'),
    ).toMatchObject({ role: 'STAFF' })
    await expect(
      access.inviteUser(owner, s1, {
        name: 'Dup',
        email: 'shirin@x.bd',
        password: 'longenough',
        role: 'STAFF',
      }),
    ).rejects.toThrow('user.exists')
    await expect(
      access.inviteUser(owner, s1, { name: 'X', email: 'bad', password: 'short', role: 'STAFF' }),
    ).rejects.toMatchObject({ code: 'validation' })
  })
})
