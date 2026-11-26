import type { ServerEvent } from '@/modules/tracking'
import { appendFile } from 'node:fs/promises'

/** H1/H2: posts a server event; 'log' (dev/e2e) records it next to the messages instead. */
export const createTrackingSender = ({
  mode,
  logFile,
  fetcher = fetch,
}: {
  mode: 'live' | 'log'
  logFile: string | undefined
  fetcher?: typeof fetch
}) => {
  if (mode === 'log')
    return async (e: ServerEvent) => {
      const line = JSON.stringify({
        at: new Date().toISOString(),
        channel: `tracking:${e.platform}`,
        ...e,
      })
      if (logFile) await appendFile(logFile, `${line}\n`)
      else console.info('[tracking]', line)
    }
  return async (e: ServerEvent) => {
    const res = await fetcher(e.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...e.headers },
      body: JSON.stringify(e.body),
    })
    if (!res.ok) throw new Error(`${e.platform} events answered ${res.status}`)
  }
}
