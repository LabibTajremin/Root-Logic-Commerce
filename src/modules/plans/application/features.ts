import { DomainError } from '@/modules/shared'
import { featureView, isFeature, type FeatureId } from '../domain/features'
import type { Plans } from './plans'

export type FeaturesRepo = {
  list(storeId: string): Promise<{ feature: string; enabled: boolean }[]>
  set(storeId: string, feature: FeatureId, enabled: boolean): Promise<void>
}

export const createFeatures = ({ repo, plans }: { repo: FeaturesRepo; plans: Plans }) => {
  const view = async (storeId: string) => {
    const [rows, owned] = await Promise.all([repo.list(storeId), plans.features(storeId)])
    return featureView(
      new Map(rows.map((r) => [r.feature, r.enabled])),
      new Set(owned.filter((o) => o.unlocked).map((o) => o.id)),
    )
  }
  const assertId = (id: string): FeatureId => {
    if (!isFeature(id)) throw new DomainError('features.unknown', { id })
    return id
  }
  return {
    list: view,
    isOn: async (storeId: string, id: FeatureId) =>
      (await view(storeId)).some((f) => f.id === id && f.active),
    // Switching off is always allowed; switching a locked (unpaid) module on is refused.
    setEnabled: async (storeId: string, id: string, enabled: boolean) => {
      const feature = assertId(id)
      if (enabled && (await view(storeId)).some((f) => f.id === feature && f.locked))
        throw new DomainError('features.locked', { id: feature })
      await repo.set(storeId, feature, enabled)
    },
  }
}

export type Features = ReturnType<typeof createFeatures>
