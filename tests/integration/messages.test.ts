import { describe, expect, it, vi } from 'vitest'
import { createSecretBox } from '@/infrastructure/crypto/secret-box'
import { createOutboxRepo } from '@/infrastructure/db/repositories/outbox-repo'
import { createDeliver } from '@/infrastructure/notify/channels'
import { businessSchema } from '@/modules/site-settings'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

describe('outbox repo', () => {
  it('dedupes, claims due rows once, and records outcomes and templates', async () => {
    const db = await createTestDb()
    const s = await seedStore(db)
    const repo = createOutboxRepo(db)
    const m = { channel: 'sms' as const, recipient: '017', body: 'hi', dedupeKey: 'k1' }
    await repo.enqueue(s, m)
    await repo.enqueue(s, m)
    await repo.enqueue(s, { ...m, dedupeKey: 'k2', channel: 'email', recipient: 'a@b.c' })
    const now = new Date(Date.now() + 1000)
    const claimed = await repo.claimDue(now, 10)
    expect(claimed.map((r) => r.recipient).sort()).toEqual(['017', 'a@b.c'])
    expect(await repo.claimDue(now, 10)).toEqual([])
    await repo.markSent(claimed[0]!.id)
    await repo.markRetry(claimed[1]!.id, 1, new Date(0), 'down')
    expect((await repo.claimDue(now, 10)).map((r) => r.attempts)).toEqual([1])
    await repo.markFailed(claimed[1]!.id, 8, 'gave up')
    expect((await repo.recent(s, 10)).map((r) => r.status).sort()).toEqual(['failed', 'sent'])
    const t = {
      event: 'order.placed',
      channel: 'sms' as const,
      locale: 'en' as const,
      body: 'A',
      enabled: true,
    }
    await repo.saveTemplate(s, t)
    await repo.saveTemplate(s, { ...t, body: 'B', enabled: false })
    expect(await repo.templates(s)).toEqual([{ ...t, body: 'B', enabled: false }])
  })
})

describe('secret box', () => {
  it('seals and opens; refuses without a key; blank stays blank', () => {
    const box = createSecretBox('k'.repeat(32))
    const sealed = box.seal('p@ss')
    expect(sealed).toMatch(/^enc:v1:/)
    expect(sealed).not.toContain('p@ss')
    expect(box.open(sealed)).toBe('p@ss')
    expect(box.open('')).toBe('')
    expect(() => createSecretBox(undefined).seal('x')).toThrow('settings.key_missing')
    expect(() => box.open('plain')).toThrow('settings.key_missing')
    expect(() => createSecretBox('other-key-other-key-other-key-00').open(sealed)).toThrow()
  })
})

describe('channel delivery', () => {
  const box = createSecretBox('k'.repeat(32))
  const business = businessSchema.parse({
    messages: {
      email: {
        enabled: true,
        host: 'smtp.x',
        port: 465,
        user: 'u',
        password: box.seal('pw'),
        from: 'Shop <s@x>',
      },
      sms: {
        enabled: true,
        url: 'https://sms.example/send?to={{to}}&msg={{text}}&key={{apiKey}}&from={{sender}}&x={{unknown}}',
        apiKey: box.seal('K 1'),
        sender: 'SHOP',
      },
      whatsapp: { enabled: true, phoneNumberId: '123', token: box.seal('T') },
    },
  })
  const settings = async () => ({ business, storeName: 'Ankito' })

  it('sends email over SMTP, SMS by URL template and WhatsApp via the Cloud API', async () => {
    const sendMail = vi.fn(async () => ({}))
    const mailer = vi.fn(() => ({ sendMail })) as never
    const calls: [string, RequestInit | undefined][] = []
    const fetcher = (async (u: string, init?: RequestInit) => (
      calls.push([u, init]),
      new Response('ok')
    )) as typeof fetch
    const deliver = createDeliver({
      mode: 'live',
      logFile: undefined,
      settings,
      box,
      fetcher,
      mailer,
    })
    await deliver('s', 'email', 'c@x', 'Hello')
    expect(mailer).toHaveBeenCalledWith({
      host: 'smtp.x',
      port: 465,
      secure: true,
      auth: { user: 'u', pass: 'pw' },
    })
    expect(sendMail).toHaveBeenCalledWith({
      from: 'Shop <s@x>',
      to: 'c@x',
      subject: 'Ankito',
      text: 'Hello',
    })
    await deliver('s', 'sms', '01712345678', 'হ্যালো & hi')
    expect(calls[0]![0]).toBe(
      `https://sms.example/send?to=01712345678&msg=${encodeURIComponent('হ্যালো & hi')}&key=K%201&from=SHOP&x=`,
    )
    await deliver('s', 'whatsapp', '01712345678', 'Hi')
    expect(calls[1]![0]).toBe('https://graph.facebook.com/v21.0/123/messages')
    expect(calls[1]![1]).toMatchObject({ method: 'POST', headers: { authorization: 'Bearer T' } })
    expect(JSON.parse(String(calls[1]![1]!.body))).toMatchObject({
      to: '8801712345678',
      text: { body: 'Hi' },
    })
  })

  it('fails on gateway errors (so the outbox retries) and logs in log mode', async () => {
    const fetcher = (async () => new Response('no', { status: 502 })) as typeof fetch
    const deliver = createDeliver({ mode: 'live', logFile: undefined, settings, box, fetcher })
    await expect(deliver('s', 'sms', '017', 'x')).rejects.toThrow('sms gateway answered 502')
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await createDeliver({ mode: 'log', logFile: undefined, settings, box })('s', 'sms', '017', 'x')
    expect(info).toHaveBeenCalled()
    info.mockRestore()
    expect(createDeliver({ mode: 'live', logFile: undefined, settings, box })).toBeTypeOf(
      'function',
    )
  })
})
