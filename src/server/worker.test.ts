import { afterEach, describe, expect, it, vi } from 'vitest'
import { startWorker } from './worker'

afterEach(() => vi.useRealTimers())

describe('background worker', () => {
  it('processes on each tick, never overlaps, and reports failures', async () => {
    vi.useFakeTimers()
    let release = () => {}
    const processDue = vi
      .fn()
      .mockImplementationOnce(() => new Promise((r) => (release = () => r({ sent: 1, failed: 0 }))))
      .mockRejectedValueOnce(new Error('db down'))
    const onError = vi.fn()
    const timer = startWorker(processDue, 1000, onError)
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(1000)
    expect(processDue).toHaveBeenCalledTimes(1)
    release()
    await vi.advanceTimersByTimeAsync(1000)
    expect(processDue).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    clearInterval(timer)
  })
})
