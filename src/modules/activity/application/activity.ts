import { DomainError } from '@/modules/shared'
import { isUndoable, type UndoableAction } from '../domain/activity'

export type ActivityEntry = {
  id: string
  action: string
  actorId: string | null
  actorIp: string
  before: unknown
  after: unknown
  undoneAt: Date | null
  createdAt: Date
}
export type NewActivity = Pick<ActivityEntry, 'action' | 'actorId' | 'actorIp' | 'before' | 'after'>
export type ActivityFilter = {
  action?: string
  actorId?: string
  q?: string
  from?: Date
  to?: Date
}

export type ActivityRepo = {
  insert(storeId: string, e: NewActivity & { createdAt: Date }): Promise<void>
  list(storeId: string, f: ActivityFilter, limit: number): Promise<ActivityEntry[]>
  /** Entries per action for the filter chips (ignores the action filter itself). */
  counts(storeId: string, f: ActivityFilter): Promise<{ action: string; n: number }[]>
  get(storeId: string, id: string): Promise<ActivityEntry | null>
  markUndone(storeId: string, id: string, at: Date): Promise<void>
  purge(olderThan: Date): Promise<void>
}

const DAY = 86_400_000

export const createActivity = ({
  repo,
  now,
  retentionDays,
}: {
  repo: ActivityRepo
  now: () => Date
  retentionDays: number
}) => ({
  record: async (storeId: string, e: NewActivity) => {
    const at = now()
    await repo.insert(storeId, { ...e, createdAt: at })
    await repo.purge(new Date(at.getTime() - retentionDays * DAY))
  },
  list: async (storeId: string, f: ActivityFilter) => {
    const [rows, counts] = await Promise.all([repo.list(storeId, f, 100), repo.counts(storeId, f)])
    return { rows, counts }
  },
  /** The entry an owner asked to undo, or why it can't be undone. */
  forUndo: async (storeId: string, id: string) => {
    const e = await repo.get(storeId, id)
    if (!e) throw new DomainError('activity.not_found')
    if (!isUndoable(e.action) || e.undoneAt) throw new DomainError('activity.not_undoable')
    return e as ActivityEntry & { action: UndoableAction }
  },
  markUndone: (storeId: string, id: string) => repo.markUndone(storeId, id, now()),
})

export type Activity = ReturnType<typeof createActivity>
