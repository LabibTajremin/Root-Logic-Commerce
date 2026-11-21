type Handler<P> = (payload: P) => Promise<void> | void

// In-process bus. A failing subscriber is reported, never propagated: side effects
// (messages, insights) must not undo or block the business action that emitted.
export const createEventBus = <M extends Record<string, unknown>>(
  onError: (error: unknown, type: keyof M) => void,
) => {
  const handlers = new Map<keyof M, Handler<never>[]>()
  return {
    on<K extends keyof M>(type: K, handler: Handler<M[K]>) {
      handlers.set(type, [...(handlers.get(type) ?? []), handler as Handler<never>])
    },
    async emit<K extends keyof M>(type: K, payload: M[K]) {
      for (const h of handlers.get(type) ?? []) {
        try {
          await (h as Handler<M[K]>)(payload)
        } catch (e) {
          onError(e, type)
        }
      }
    },
  }
}

export type EventBus<M extends Record<string, unknown>> = ReturnType<typeof createEventBus<M>>
