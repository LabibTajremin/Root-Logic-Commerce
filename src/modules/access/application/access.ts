import { DomainError } from '@/modules/shared'
import { isAllowed, type Actor, type Permission, type Role } from '../domain/permissions'

export type StoreUser = { id: string; name: string; email: string; role: Role }
export type UsersRepo = {
  listByStore(storeId: string): Promise<StoreUser[]>
  setRole(storeId: string, userId: string, role: Exclude<Role, 'SUPER_ADMIN'>): Promise<boolean>
}

export const authorize = (actor: Actor | null, permission: Permission, storeId: string): Actor => {
  if (!actor) throw new DomainError('access.unauthenticated')
  if (!isAllowed(actor, permission, storeId)) throw new DomainError('access.denied', { permission })
  return actor
}

export const createAccess = ({ repo }: { repo: UsersRepo }) => ({
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
})

export type Access = ReturnType<typeof createAccess>
