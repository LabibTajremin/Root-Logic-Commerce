export const roles = ['SUPER_ADMIN', 'OWNER', 'STAFF'] as const
export type Role = (typeof roles)[number]

export const permissions = [
  'orders.manage',
  'products.manage',
  'stock.manage',
  'settings.manage',
  'users.manage',
  'plans.manage',
] as const
export type Permission = (typeof permissions)[number]

const GRANTS: Record<Role, readonly Permission[]> = {
  SUPER_ADMIN: permissions,
  OWNER: ['orders.manage', 'products.manage', 'stock.manage', 'settings.manage', 'users.manage'],
  STAFF: ['orders.manage', 'products.manage', 'stock.manage'],
}

export const can = (role: Role, permission: Permission) => GRANTS[role].includes(permission)

export type Actor = { id: string; role: Role; storeId: string | null }

// Every server action passes through here: role AND tenant must match (SUPER_ADMIN spans stores).
export const isAllowed = (actor: Actor, permission: Permission, storeId: string) =>
  can(actor.role, permission) && (actor.role === 'SUPER_ADMIN' || actor.storeId === storeId)
