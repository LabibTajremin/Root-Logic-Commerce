import { isDomainError } from '@/modules/shared'

/** Never a 500 for a shopper: domain errors are translated, the rest logged as a retry hint. */
export const actionError = (t: (k: string) => string, e: unknown, tag: string) => {
  if (!isDomainError(e)) console.error(`[${tag}]`, e)
  return { error: t(isDomainError(e) ? `error.${e.code}` : 'error.unexpected') }
}
