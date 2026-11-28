import type { ActivityFilter } from '@/modules/activity'

export type ActivitySearch = {
  action?: string
  actor?: string
  q?: string
  from?: string
  to?: string
}

/** Query string → filter; dates are whole days in Bangladesh time. */
export const toFilter = (s: ActivitySearch): ActivityFilter => ({
  action: s.action || undefined,
  actorId: s.actor || undefined,
  q: s.q || undefined,
  from: s.from ? new Date(`${s.from}T00:00:00+06:00`) : undefined,
  to: s.to ? new Date(`${s.to}T23:59:59+06:00`) : undefined,
})

/** Link for a filter chip: keeps the other filters, swaps (or clears) the action. */
export const chipHref = (s: ActivitySearch, action?: string) => {
  const q = new URLSearchParams(Object.entries(s).filter(([k, v]) => k !== 'action' && v))
  if (action) q.set('action', action)
  return `/admin/activity?${q}`
}

/** A removed user or a system change still reads sensibly. */
export const actorName = (names: Map<string, string>, id: string | null, fallback: string) =>
  (id && names.get(id)) || fallback
