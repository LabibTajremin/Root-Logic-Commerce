import { z } from 'zod'
import { DomainError, validate } from '@/modules/shared'
import { isAllowed, type Actor, type Permission, type Role } from '../domain/permissions'

export type StoreUser = { id: string; name: string; email: string; role: Role }
export type UsersRepo = {
  listByStore(storeId: string): Promise<StoreUser[]>
  setRole(storeId: string, userId: string, role: Exclude<Role, 'SUPER_ADMIN'>): Promise<boolean>
  /** Returns false when the email is already taken. */
  create(
    storeId: string,
    user: { name: string; email: string; role: Exclude<Role, 'SUPER_ADMIN'>; passwordHash: string },
  ): Promise<boolean>
}

const invite = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.enum(['OWNER', 'STAFF']),
})

export const authorize = (actor: Actor | null, permission: Permission, storeId: string): Actor => {
  if (!actor) throw new DomainError('access.unauthenticated')
  if (!isAllowed(actor, permission, storeId)) throw new DomainError('access.denied', { permission })
  return actor
}

export const createAccess = ({
  repo,
  hash,
}: {
  repo: UsersRepo
  hash: (password: string) => Promise<string>
}) => ({
  async listUsers(actor: Actor | null, storeId: string) {
    authorize(actor, 'users.manage', storeId)
    return repo.listByStore(storeId)
  },
  async setRole(
    actor: Actor | null,
    storeId: string,
    userId: string,
    role: Exclude<Role, 'SUPER_ADMIN'>,
  ) {
    const me = authorize(actor, 'users.manage', storeId)
    // An owner demoting themselves could lock the store out of its own settings.
    if (me.id === userId) throw new DomainError('access.self_role_change')
    if (!(await repo.setRole(storeId, userId, role))) throw new DomainError('access.user_not_found')
  },
  async inviteUser(actor: Actor | null, storeId: string, input: unknown) {
    authorize(actor, 'users.manage', storeId)
    const { password, ...u } = validate(invite, input)
    if (!(await repo.create(storeId, { ...u, passwordHash: await hash(password) })))
      throw new DomainError('user.exists')
  },
})

export type Access = ReturnType<typeof createAccess>
