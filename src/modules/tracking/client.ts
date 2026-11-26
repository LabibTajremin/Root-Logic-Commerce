// Browser entry: event names only, so storefront chunks never pull in zod or server code.
export { eventNames, type TrackEvent } from './domain/events'
