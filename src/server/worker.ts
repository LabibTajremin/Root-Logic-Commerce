/**
 * VPS profile: run a background task every `ms` from the app process itself (Vercel uses
 * the cron route instead). Never overlaps; unref() so it can't keep a shutting-down process alive.
 */
export const startWorker = (
  task: () => Promise<unknown>,
  ms: number,
  onError: (e: unknown) => void,
) => {
  let busy = false
  const tick = async () => {
    if (busy) return
    busy = true
    try {
      await task()
    } catch (e) {
      onError(e)
    } finally {
      busy = false
    }
  }
  return setInterval(tick, ms).unref()
}
