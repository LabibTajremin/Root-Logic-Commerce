import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createOtpRepo } from '@/infrastructure/db/repositories/otp-repo'
import { createLogNotifier } from '@/infrastructure/notify/log-notifier'
import { createContainer } from '@/server/container'
import { createTestDb } from '../fixtures/db'
import { seedStore, testConfig } from '../fixtures/store'

describe('otp repo', () => {
  it('counts, finds the latest, bumps and consumes per store + target', async () => {
    const db = await createTestDb()
    const [a, b] = [await seedStore(db, 'a'), await seedStore(db, 'b')]
    const repo = createOtpRepo(db)
    const since = new Date(Date.now() - 1000)
    const expiresAt = new Date(Date.now() + 60_000)
    expect(await repo.latest(a, 't')).toBeNull()
    await repo.insert(a, { target: 't', codeHash: 'h1', expiresAt })
    await new Promise((r) => setTimeout(r, 5))
    await repo.insert(a, { target: 't', codeHash: 'h2', expiresAt })
    await repo.insert(b, { target: 't', codeHash: 'hb', expiresAt })
    expect(await repo.countSince(a, 't', since)).toBe(2)
    expect(await repo.countSince(a, 't', new Date(Date.now() + 1000))).toBe(0)
    const row = (await repo.latest(a, 't'))!
    expect(row).toMatchObject({ codeHash: 'h2', attempts: 0, consumedAt: null })
    await repo.bumpAttempts(row.id)
    await repo.consume(row.id)
    expect(await repo.latest(a, 't')).toMatchObject({ attempts: 1, consumedAt: expect.any(Date) })
    expect(await repo.latest(b, 't')).toMatchObject({ codeHash: 'hb' })
  })
})

describe('log notifier', () => {
  it('appends JSON lines to a file, or logs when no file is set', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'rlc-')), 'notify.log')
    await createLogNotifier(file)('sms', '017', 'hi')
    await createLogNotifier(file)('email', 'a@b.c', 'yo')
    const lines = readFileSync(file, 'utf8')
      .trim()
      .split('\n')
      .map((l) => JSON.parse(l))
    expect(lines).toMatchObject([
      { channel: 'sms', to: '017', text: 'hi' },
      { channel: 'email', to: 'a@b.c', text: 'yo' },
    ])
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await createLogNotifier(undefined)('sms', '017', 'hi')
    expect(info).toHaveBeenCalledWith('[notify]', expect.stringContaining('"to":"017"'))
    info.mockRestore()
  })

  it('container wires OTP with real hashing and 6-digit codes', async () => {
    const db = await createTestDb()
    const file = join(mkdtempSync(join(tmpdir(), 'rlc-')), 'n.log')
    const c = createContainer({
      config: testConfig({ notifyLogFile: file }),
      db,
      onEventError: () => {},
    })
    const store = await seedStore(db)
    expect(await c.otp.request(store, 'sms', '01712345678', 'S')).toBe('•••••••678')
    const code = /code is (\d{6})/.exec(readFileSync(file, 'utf8'))![1]!
    const row = (await createOtpRepo(db).latest(store, '01712345678'))!
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/)
    await c.otp.verify(store, '01712345678', code)
  })
})
