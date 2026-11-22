import { DomainError, validate } from '@/modules/shared'
import { pageInput, pageTemplates } from '../domain/pages'
import type { PagesRepo } from './ports'

export const createPages = ({ repo }: { repo: PagesRepo }) => {
  const taken = () => new DomainError('pages.slug_taken')
  return {
    list: (storeId: string) => repo.list(storeId),
    /** What shoppers may open: published pages only. */
    published: async (storeId: string) => (await repo.list(storeId)).filter((p) => p.published),
    get: async (storeId: string, slug: string) =>
      (await repo.list(storeId)).find((p) => p.published && p.slug === slug) ?? null,
    create: async (storeId: string, input: unknown) =>
      (await repo.insert(storeId, validate(pageInput, input))) ?? Promise.reject(taken()),
    update: async (storeId: string, id: string, input: unknown) => {
      const ok = await repo.update(storeId, id, validate(pageInput, input))
      if (ok === null) throw taken()
      if (!ok) throw new DomainError('pages.not_found')
    },
    remove: (storeId: string, id: string) => repo.remove(storeId, id),
    /** Adds the standard pages the store doesn't have yet, in the owner's language. */
    addTemplates: async (storeId: string, locale: 'en' | 'bn') => {
      const have = new Set((await repo.list(storeId)).map((p) => p.slug))
      for (const t of pageTemplates[locale].filter((t) => !have.has(t.slug)))
        await repo.insert(storeId, { ...t, published: true, inFooter: true })
    },
  }
}

export type Pages = ReturnType<typeof createPages>
