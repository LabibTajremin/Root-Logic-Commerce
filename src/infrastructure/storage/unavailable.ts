import type { StoragePort } from '@/modules/media'
import { DomainError } from '@/modules/shared'

/** Configured driver without an adapter yet: uploads fail with a friendly message, Drive links still work. */
export const unavailableStorage = (driver: string): StoragePort => ({
  put: async () => {
    throw new DomainError('media.storage_unavailable', { driver })
  },
  get: async () => null,
})
