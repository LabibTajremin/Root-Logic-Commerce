import { DomainError } from './errors'

type Options = { limit: number; windowMs: number; now?: () => number }

/**
 * Fixed-window limiter kept in process memory: enough for one app process (VPS) and a
 * best-effort brake per serverless instance. Expired windows are dropped on each hit.
 */
export const createRateLimiter = ({ limit, windowMs, now = Date.now }: Options) => {
  const windows = new Map<string, { start: number; count: number }>()
  /** Counts one hit; false once the key is over its limit for the window. */
  const allow = (key: string) => {
    const t = now()
    for (const [k, w] of windows) if (t - w.start >= windowMs) windows.delete(k)
    const w = windows.get(key) ?? { start: t, count: 0 }
    w.count += 1
    windows.set(key, w)
    return w.count <= limit
  }
  return {
    allow,
    assert(key: string) {
      if (!allow(key)) throw new DomainError('rate.limited')
    },
    size: () => windows.size,
  }
}
