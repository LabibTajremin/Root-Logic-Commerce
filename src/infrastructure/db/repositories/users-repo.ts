import { and, asc, eq, ne } from 'drizzle-orm'
import type { UsersRepo } from '@/modules/access'
import type { Db } from '../client'
import { users } from '../schema'

export const createUsersRepo = (db: Db): UsersRepo => ({
  listByStore: (storeId) =>
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role })
      .from(users)
      .where(eq(users.storeId, storeId))
      .orderBy(asc(users.name)),
  setRole: async (storeId, userId, role) =>
    (
      await db
        .update(users)
        .set({ role, updatedAt: new Date() })
        .where(and(eq(users.storeId, storeId), eq(users.id, userId), ne(users.role, 'SUPER_ADMIN')))
        .returning({ id: users.id })
    ).length > 0,
})
