import { mkdir, readFile, statfs, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import type { StoragePort } from '@/modules/media'
import { DomainError } from '@/modules/shared'

/**
 * VPS disk (Caddy can serve `root` directly under /media/*). Keys never leave `root`.
 * The disk is shared by the OS, Postgres and every store: refuse writes below `minFreeBytes`.
 */
export const createLocalStorage = (root: string, minFreeBytes: number): StoragePort => {
  const base = resolve(root)
  const path = (key: string) => {
    const p = resolve(join(base, key))
    if (!p.startsWith(`${base}/`)) throw new Error(`storage key escapes root: ${key}`)
    return p
  }
  return {
    async put(key, data) {
      const file = path(key)
      await mkdir(dirname(file), { recursive: true })
      const fs = await statfs(base)
      if (fs.bavail * fs.bsize < minFreeBytes) throw new DomainError('media.disk_full')
      await writeFile(file, data)
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(path(key)))
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null
        throw e
      }
    },
  }
}
