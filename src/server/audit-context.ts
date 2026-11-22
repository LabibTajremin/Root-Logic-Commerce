import { AsyncLocalStorage } from 'node:async_hooks'

export type AuditActor = { actorId: string | null; ip: string }

// Admin actions run inside this so deep services can log "who, from where" without HTTP access.
// Kept on globalThis: Next bundles each route separately, and a per-bundle copy would leave
// the container (created by one route) reading a different store than the action set.
const KEY = Symbol.for('rlc.audit-actor')
const g = globalThis as unknown as Record<symbol, AsyncLocalStorage<AuditActor>>
const store = (g[KEY] ??= new AsyncLocalStorage<AuditActor>())

export const withAuditActor = <T>(actor: AuditActor, run: () => T) => store.run(actor, run)

/** The acting admin, or a system actor (cron, events, tests) when outside an admin action. */
export const auditActor = (): AuditActor => store.getStore() ?? { actorId: null, ip: 'system' }
