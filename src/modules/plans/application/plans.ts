import { DomainError } from '@/modules/shared'
import { featureStates, isEntitlement, type EntitlementId } from '../domain/entitlements'

export type EntitlementsRepo = {
  list(storeId: string): Promise<string[]>
  grant(storeId: string, id: EntitlementId): Promise<void>
  revoke(storeId: string, id: EntitlementId): Promise<void>
}

// Effective entitlements = config seed (store.config.ts) ∪ what SUPER_ADMIN granted in DB.
export const createPlans = ({
  repo,
  configured,
}: {
  repo: EntitlementsRepo
  configured: readonly EntitlementId[]
}) => {
  const owned = async (storeId: string) =>
    new Set<EntitlementId>([...configured, ...(await repo.list(storeId)).filter(isEntitlement)])
  const assertId = (id: string): EntitlementId => {
    if (!isEntitlement(id)) throw new DomainError('plans.unknown_entitlement', { id })
    return id
  }
  return {
    has: async (storeId: string, id: EntitlementId) => (await owned(storeId)).has(id),
    features: async (storeId: string) => featureStates(await owned(storeId)),
    grant: async (storeId: string, id: string) => repo.grant(storeId, assertId(id)),
    revoke: async (storeId: string, id: string) => repo.revoke(storeId, assertId(id)),
  }
}

export type Plans = ReturnType<typeof createPlans>
