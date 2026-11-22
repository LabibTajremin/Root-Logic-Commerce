/** Actions the owner can take back from the activity log (F3). */
export const undoableActions = ['settings.design', 'settings.business', 'settings.layout'] as const
export type UndoableAction = (typeof undoableActions)[number]
export const isUndoable = (a: string): a is UndoableAction =>
  (undoableActions as readonly string[]).includes(a)

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/** Dotted paths whose values differ, two levels deep — what the log shows as "changed". */
export const changedPaths = (before: unknown, after: unknown, prefix = '', depth = 2): string[] => {
  if (!isObj(before) || !isObj(after) || depth === 0)
    return JSON.stringify(before) === JSON.stringify(after) ? [] : [prefix || '*']
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  return keys.flatMap((k) =>
    changedPaths(before[k], after[k], prefix ? `${prefix}.${k}` : k, depth - 1),
  )
}
