import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { users } from '@/infrastructure/db/schema'
import { runtime } from '@/server/runtime'

const g = globalThis as { __rlcRuntime?: unknown }
const KEYS = [
  'BOOTSTRAP_OWNER_EMAIL',
  'BOOTSTRAP_OWNER_PASSWORD',
  'BOOTSTRAP_OWNER_NAME',
  'BOOTSTRAP_HOSTS',
  'BOOTSTRAP_SUPER_EMAIL',
  'BOOTSTRAP_SUPER_PASSWORD',
]
const saved = { ...process.env }

const boot = async (env: Record<string, string>) => {
  delete g.__rlcRuntime
  for (const k of KEYS) delete process.env[k]
  Object.assign(process.env, {
    DATABASE_URL: `pglite:${join(mkdtempSync(join(tmpdir(), 'rlc-rt-')), 'db')}`,
    AUTH_SECRET: 'x'.repeat(32),
    ...env,
  })
  const rt = await runtime()
  expect(await runtime()).toBe(rt)
  return { rt, logins: await rt.db.select({ role: users.role, name: users.name }).from(users) }
}

afterEach(() => {
  process.env = { ...saved }
  delete g.__rlcRuntime
})

describe('runtime', () => {
  it('boots without seeding when bootstrap env is incomplete, and logs subscriber failures', async () => {
    const { rt, logins } = await boot({
      BOOTSTRAP_OWNER_EMAIL: 'o@x.test',
      BOOTSTRAP_SUPER_EMAIL: 'l@x.test',
    })
    expect(logins).toEqual([])
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    rt.container.bus.on('order.placed', () => {
      throw new Error('down')
    })
    await rt.container.bus.emit('order.placed', { storeId: 's', orderId: 'o', orderNo: 1 })
    expect(err).toHaveBeenCalledWith('[event order.placed]', expect.any(Error))
    err.mockRestore()
  })

  it('seeds the owner (default name, no hosts) and the SUPER_ADMIN', async () => {
    const { logins } = await boot({
      BOOTSTRAP_OWNER_EMAIL: 'o@x.test',
      BOOTSTRAP_OWNER_PASSWORD: 'owner-pass-1',
      BOOTSTRAP_SUPER_EMAIL: 'l@x.test',
      BOOTSTRAP_SUPER_PASSWORD: 'lab-pass-12',
    })
    expect(logins).toEqual(
      expect.arrayContaining([
        { role: 'OWNER', name: 'Owner' },
        { role: 'SUPER_ADMIN', name: 'Root Logic Lab' },
      ]),
    )
  })

  it('uses the configured owner name and hosts', async () => {
    const { rt, logins } = await boot({
      BOOTSTRAP_OWNER_EMAIL: 'o@x.test',
      BOOTSTRAP_OWNER_PASSWORD: 'owner-pass-1',
      BOOTSTRAP_OWNER_NAME: 'Rahim',
      BOOTSTRAP_HOSTS: 'a.test,,b.test',
    })
    expect(logins).toEqual([{ role: 'OWNER', name: 'Rahim' }])
    expect(await rt.container.stores.findByHost('b.test')).toMatchObject({ slug: 'my-store' })
  })
})
