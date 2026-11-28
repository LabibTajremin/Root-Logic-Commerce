import type { Metadata } from 'next'
import Link from 'next/link'
import { helpText } from '@/help'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card, Field, HelpHint } from '@/ui/primitives'
import { adminContext } from '../context'
import { addStandardPages, deletePage, savePage } from './actions'

export const metadata: Metadata = { title: 'Pages' }

const check = 'size-6 accent-[var(--color-accent)]'

export default async function PagesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const { pages, store, allowed, locale, t } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const list = await pages.list(store.id)
  const editing = list.find((p) => p.id === edit)
  return (
    <>
      <h1 className="font-heading text-3xl">{t('pages.title')}</h1>
      <p className="text-sm text-muted">{t('pages.intro')}</p>
      <div className="grid gap-5 lg:grid-cols-[1fr_480px]">
        <Card className="flex flex-col gap-3">
          <ul className="flex flex-col divide-y divide-line">
            {list.map((p) => (
              <li key={p.id} data-testid={`page-${p.slug}`}>
                <Link
                  href={`/admin/pages?edit=${p.id}`}
                  className="flex min-h-12 items-center gap-3"
                >
                  <span className="flex-1 font-semibold">{p.title}</span>
                  <span className="text-sm text-muted">/page/{p.slug}</span>
                  <Badge tone={p.published ? 'success' : 'neutral'}>
                    {t(p.published ? 'pages.published' : 'pages.draft')}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
          <ActionForm action={addStandardPages} saved={t('common.saved')}>
            <Button type="submit" variant="secondary" icon="plus">
              {t('pages.addStandard')}
            </Button>
          </ActionForm>
        </Card>
        <Card>
          <ActionForm action={savePage} className="flex flex-col gap-4">
            <h2 className="font-semibold">{t(editing ? 'pages.edit' : 'pages.new')}</h2>
            <input type="hidden" name="id" value={editing?.id ?? ''} />
            <Field
              id="title"
              name="title"
              required
              defaultValue={editing?.title}
              label={t('pages.pageTitle')}
              help={helpText(locale, 'pages.title')}
              helpLabel={t('common.help')}
            />
            <Field
              id="slug"
              name="slug"
              required
              defaultValue={editing?.slug}
              label={t('pages.slug')}
              help={helpText(locale, 'pages.slug')}
              helpLabel={t('common.help')}
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <label htmlFor="body" className="text-sm font-semibold">
                  {t('pages.body')}
                </label>
                <HelpHint
                  id="body"
                  text={helpText(locale, 'pages.body')}
                  label={t('common.help')}
                />
              </div>
              <textarea
                id="body"
                name="body"
                rows={12}
                maxLength={20000}
                defaultValue={editing?.body}
                className="rounded-control border border-line bg-surface p-3 text-base outline-accent"
              />
            </div>
            <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
              {t('pages.publish')}
              <input
                type="checkbox"
                name="published"
                defaultChecked={editing?.published ?? true}
                className={check}
              />
            </label>
            <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
              {t('pages.inFooter')}
              <input
                type="checkbox"
                name="inFooter"
                defaultChecked={editing?.inFooter ?? true}
                className={check}
              />
            </label>
            <Button type="submit" icon="check">
              {t('common.save')}
            </Button>
          </ActionForm>
          {editing && (
            <ActionForm
              action={deletePage}
              className="mt-6 flex flex-col gap-3 border-t border-line pt-4"
            >
              <input type="hidden" name="id" value={editing.id} />
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input type="checkbox" name="confirm" required className={check} />
                {t('pages.confirmDelete')}
              </label>
              <Button type="submit" variant="secondary">
                {t('pages.delete')}
              </Button>
            </ActionForm>
          )}
        </Card>
      </div>
    </>
  )
}
