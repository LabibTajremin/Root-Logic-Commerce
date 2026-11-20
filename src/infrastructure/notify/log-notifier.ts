import { appendFile } from 'node:fs/promises'
import type { Send } from '@/modules/messages'

/**
 * Development/e2e channel: records each message instead of delivering it. Real email,
 * SMS and WhatsApp adapters replace it through the same `Send` port.
 */
export const createLogNotifier =
  (file: string | undefined): Send =>
  async (channel, to, text) => {
    const line = JSON.stringify({ at: new Date().toISOString(), channel, to, text })
    if (file) await appendFile(file, `${line}\n`)
    else console.info('[notify]', line)
  }
