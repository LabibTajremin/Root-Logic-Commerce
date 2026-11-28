// Zod-free: the browser decides where and when a popup may show.

export type PopupPages = 'all' | 'home' | 'product' | 'checkout'
export type PopupDevice = 'all' | 'mobile' | 'desktop'
export type PopupWhere = { pages: PopupPages; device: PopupDevice; everyDays: number }

/** B8: does this popup belong on this page and screen? */
export const popupFits = (p: PopupWhere, path: string, mobile: boolean) =>
  (p.device === 'all' || (p.device === 'mobile') === mobile) &&
  (p.pages === 'all' ||
    (p.pages === 'home' && path === '/') ||
    (p.pages === 'product' && path.startsWith('/p/')) ||
    (p.pages === 'checkout' && path.startsWith('/checkout')))

/** B8: once per N days (0 = every visit). `last`: when this device last saw it, if ever. */
export const popupDue = (everyDays: number, last: number | null, now: number) =>
  last === null || now - last >= everyDays * 86_400_000
