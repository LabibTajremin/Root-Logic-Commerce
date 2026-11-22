import { describe, expect, it } from 'vitest'
import { auditActor, withAuditActor } from './audit-context'

describe('audit context', () => {
  it('is the admin inside an action and the system outside', async () => {
    expect(auditActor()).toEqual({ actorId: null, ip: 'system' })
    const inside = await withAuditActor({ actorId: 'u1', ip: '1.2.3.4' }, async () => auditActor())
    expect(inside).toEqual({ actorId: 'u1', ip: '1.2.3.4' })
  })
})
