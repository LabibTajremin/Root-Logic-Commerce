/**
 * A list kept in browser storage. Anything that isn't a JSON array (tampered, outdated)
 * is dropped. Kept apart from the stores so the fallback isn't split across page chunks.
 */
export const storedList = <T>(raw: string, empty: T[]): T[] => {
  try {
    const v: unknown = JSON.parse(raw)
    return Array.isArray(v) ? (v as T[]) : empty
  } catch {
    return empty
  }
}
