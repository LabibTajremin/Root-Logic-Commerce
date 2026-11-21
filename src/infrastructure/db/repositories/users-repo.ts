import { randomUUID } from 'node:crypto'
import { and, asc, eq, ne } from 'drizzle-orm'
import type { UsersRepo } from '@/modules/access'
import type { Db } from '../client'
import { accounts, users } from '../schema'

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
  create: (storeId, u) =>
    db.transaction(async (tx) => {
      const id = randomUUID()
      const [row] = await tx
        .insert(users)
        .values({ id, storeId, name: u.name, email: u.email, role: u.role, emailVerified: true })
        .onConflictDoNothing()
        .returning({ id: users.id })
      if (!row) return false
      // Same shape Better Auth writes for email+password sign-up.
      await tx.insert(accounts).values({
        id: randomUUID(),
        userId: id,
        accountId: id,
        providerId: 'credential',
        password: u.passwordHash,
      })
      return true
    }),
})
