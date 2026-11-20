type Processor = { processDue(): Promise<{ sent: number; failed: number }> }

/**
 * VPS profile: send queued messages every `ms` from the app process itself (Vercel uses
 * the cron route instead). unref() so it never keeps a shutting-down process alive.
 */
export const startOutboxWorker = (m: Processor, ms: number, onError: (e: unknown) => void) => {
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      await m.processDue()
    } catch (e) {
      onError(e)
    } finally {
      busy = false
    }
  }
  return setInterval(tick, ms).unref()
}
