// Client-safe entry: pure rules only, so browser bundles don't pull in the orders service.
export { freeShipping, type FreeShippingRule } from './domain/rules'
export { bdDistricts, detectZone, type AddressRule } from './domain/districts'
