import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { createTrackingSender } from '@/infrastructure/tracking/sender'
import type { ServerEvent } from '@/modules/tracking'

const event: ServerEvent = {
  platform: 'meta',
  url: 'https://graph.facebook.com/v21.0/1/events',
  headers: { 'x-test': '1' },
  body: { data: [] },
}

describe('tracking sender', () => {
  it('logs to the notify file, or the console when no file is set', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'rlc-')), 'notify.log')
    await createTrackingSender({ mode: 'log', logFile: file })(event)
    expect(JSON.parse(readFileSync(file, 'utf8'))).toMatchObject({
      channel: 'tracking:meta',
      url: event.url,
    })
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    await createTrackingSender({ mode: 'log', logFile: undefined })(event)
    expect(info).toHaveBeenCalledWith('[tracking]', expect.stringContaining('tracking:meta'))
    info.mockRestore()
  })

  it('posts JSON live and fails on a bad answer', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response('{}'))
    await createTrackingSender({ mode: 'live', logFile: undefined, fetcher })(event)
    expect(fetcher).toHaveBeenCalledWith(event.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-test': '1' },
      body: '{"data":[]}',
    })
    fetcher.mockResolvedValueOnce(new Response('no', { status: 400 }))
    await expect(
      createTrackingSender({ mode: 'live', logFile: undefined, fetcher })(event),
    ).rejects.toThrow('meta events answered 400')
  })
})
