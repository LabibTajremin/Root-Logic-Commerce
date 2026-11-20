import { describe, expect, it } from 'vitest'
import type { OtpRepo, OtpRow } from './ports'
import { createOtp } from './otp'

const fakeRepo = () => {
  const rows: (OtpRow & { storeId: string; createdAt: Date })[] = []
  let clock = new Date('2026-01-01T10:00:00Z')
  const repo: OtpRepo = {
    countSince: async (s, t, since) =>
      rows.filter((r) => r.storeId === s && r.target === t && r.createdAt >= since).length,
    insert: async (s, r) => {
      rows.push({
        ...r,
        id: String(rows.length),
        storeId: s,
        attempts: 0,
        consumedAt: null,
        createdAt: clock,
      })
    },
    latest: async (s, t) => rows.filter((r) => r.storeId === s && r.target === t).at(-1) ?? null,
    bumpAttempts: async (id) => void rows[Number(id)]!.attempts++,
    consume: async (id) => void (rows[Number(id)]!.consumedAt = clock),
  }
  return {
    repo,
    rows,
    tick: (ms: number) => (clock = new Date(clock.getTime() + ms)),
    now: () => clock,
  }
}

const setup = () => {
  const f = fakeRepo()
  const sent: string[] = []
  const otp = createOtp({
    repo: f.repo,
    send: async (_c, to, text) => void sent.push(`${to}|${text}`),
    hash: (s) => `h(${s})`,
    code: () => '123456',
    now: f.now,
  })
  return { ...f, sent, otp }
}

describe('otp', () => {
  it('sends a hashed, masked code and verifies it once', async () => {
    const { otp, sent, rows } = setup()
    expect(await otp.request('s1', 'sms', '01712345678', 'Ankito')).toBe('•••••••678')
    expect(sent).toEqual(['01712345678|Ankito: your code is 123456 / আপনার কোড 123456'])
    expect(rows[0]!.codeHash).toBe('h(s1:01712345678:123456)')
    await otp.verify('s1', '01712345678', ' 123456 ')
    await expect(otp.verify('s1', '01712345678', '123456')).rejects.toThrow('otp.expired')
  })

  it('rejects wrong, expired, missing and over-tried codes', async () => {
    const { otp, tick } = setup()
    await expect(otp.verify('s1', 'x@y.z', '123456')).rejects.toThrow('otp.expired')
    await otp.request('s1', 'email', 'x@y.z', 'S')
    await expect(otp.verify('s1', 'x@y.z', '000000')).rejects.toThrow('otp.invalid')
    for (let i = 0; i < 4; i++)
      await expect(otp.verify('s1', 'x@y.z', '0')).rejects.toThrow('otp.invalid')
    await expect(otp.verify('s1', 'x@y.z', '123456')).rejects.toThrow('otp.expired')
    await otp.request('s1', 'email', 'x@y.z', 'S')
    tick(10 * 60_000)
    await expect(otp.verify('s1', 'x@y.z', '123456')).rejects.toThrow('otp.expired')
  })

  it('limits requests per target per hour', async () => {
    const { otp, tick } = setup()
    for (let i = 0; i < 5; i++) await otp.request('s1', 'sms', '01712345678', 'S')
    await expect(otp.request('s1', 'sms', '01712345678', 'S')).rejects.toThrow('otp.limited')
    await otp.request('s1', 'sms', '01812345678', 'S')
    tick(60 * 60_000 + 1)
    await otp.request('s1', 'sms', '01712345678', 'S')
  })
})
