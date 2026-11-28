import { describe, expect, it } from 'vitest'
import { createPages } from '@/modules/pages'
import { createPagesRepo } from '@/infrastructure/db/repositories/pages-repo'
import { createTestDb } from '../fixtures/db'
import { seedStore } from '../fixtures/store'

describe('CMS pages (J8)', () => {
  it('stores pages per store, keeps slugs unique and orders them for the footer', async () => {
    const db = await createTestDb()
    const [a, b] = [await seedStore(db), await seedStore(db, 'other')]
    const pages = createPages({ repo: createPagesRepo(db) })
    const base = { title: 'FAQ', body: '## Q\n\nA', published: true, inFooter: true }

    const faq = await pages.create(a, { ...base, slug: 'faq' })
    await expect(pages.create(a, { ...base, slug: 'faq' })).rejects.toThrow('pages.slug_taken')
    await pages.create(b, { ...base, slug: 'faq' })
    await pages.addTemplates(a, 'en')
    expect((await pages.list(a)).map((p) => p.slug)).toEqual([
      'faq',
      'about',
      'return-policy',
      'privacy',
      'terms',
      'contact',
    ])

    await expect(pages.update(a, faq.id, { ...base, slug: 'about' })).rejects.toThrow(
      'pages.slug_taken',
    )
    await pages.update(a, faq.id, { ...base, slug: 'help', published: false })
    expect(await pages.get(a, 'help')).toBeNull()
    await expect(
      pages.update(a, '00000000-0000-4000-8000-000000000000', { ...base, slug: 'x' }),
    ).rejects.toThrow('pages.not_found')
    await pages.remove(a, faq.id)
    expect(await pages.list(a)).toHaveLength(5)
    expect(await pages.list(b)).toHaveLength(1)
  })
})
