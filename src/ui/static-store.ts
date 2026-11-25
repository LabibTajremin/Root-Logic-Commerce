/** useSyncExternalStore for a value fixed per browser (e.g. a feature check): nothing to watch. */
export const noSubscribe = () => noUnsubscribe
const noUnsubscribe = () => {}
