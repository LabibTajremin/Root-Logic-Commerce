import { AsyncLocalStorage } from 'node:async_hooks'

export type AuditActor = { actorId: string | null; ip: string }

// Admin actions run inside this so deep services can log "who, from where" without HTTP access.
const store = new AsyncLocalStorage<AuditActor>()

export const withAuditActor = <T>(actor: AuditActor, run: () => T) => store.run(actor, run)

/** The acting admin, or a system actor (cron, events, tests) when outside an admin action. */
export const auditActor = (): AuditActor => store.getStore() ?? { actorId: null, ip: 'system' }
