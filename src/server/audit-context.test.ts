import { describe, expect, it, vi } from 'vitest'
import { auditActor, withAuditActor } from './audit-context'

describe('audit context', () => {
  it('is the admin inside an action and the system outside', async () => {
    expect(auditActor()).toEqual({ actorId: null, ip: 'system' })
    const inside = await withAuditActor({ actorId: 'u1', ip: '1.2.3.4' }, async () => auditActor())
    expect(inside).toEqual({ actorId: 'u1', ip: '1.2.3.4' })
  })

  it('is shared by every copy of the module (Next bundles routes separately)', async () => {
    vi.resetModules()
    const copy = await import('./audit-context')
    const seen = await withAuditActor({ actorId: 'u2', ip: '5.6.7.8' }, async () =>
      copy.auditActor(),
    )
    expect(seen).toEqual({ actorId: 'u2', ip: '5.6.7.8' })
  })
})
