import { DomainError } from './errors'

type Options = { limit: number; windowMs: number; now?: () => number }

/**
 * Fixed-window limiter kept in process memory: enough for one app process (VPS) and a
 * best-effort brake per serverless instance. Expired windows are dropped on each hit.
 */
export const createRateLimiter = ({ limit, windowMs, now = Date.now }: Options) => {
  const windows = new Map<string, { start: number; count: number }>()
  return {
    assert(key: string) {
      const t = now()
      for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k)
      const w = windows.get(key) ?? { start: t, count: 0 }
      w.count += 1
      windows.set(key, w)
      if (w.count > limit) throw new DomainError('rate.limited')
    },
    size: () => windows.size,
  }
}
