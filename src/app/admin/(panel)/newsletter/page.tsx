import type { Metadata } from 'next'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'

export const metadata: Metadata = { title: 'Newsletter' }

/** B13: who signed up for offers (with consent), for the owner's own SMS/email tool. */
export default async function NewsletterAdmin() {
  const { t, newsletter, store } = await adminContext('settings.manage')
  const list = await newsletter.list(store.id)
  return (
    <>
      <h1 className="font-heading text-3xl">{t('newsletter.admin')}</h1>
      <p className="text-sm text-muted">{t('newsletter.adminHelp')}</p>
      {list.length === 0 ? (
        <Card>
          <p className="text-muted">{t('newsletter.empty')}</p>
        </Card>
      ) : (
        <>
          <a href="/admin/newsletter/export" download className="w-fit font-semibold underline">
            {t('newsletter.download', { n: list.length })}
          </a>
          <ul className="flex flex-col gap-1 text-sm" data-testid="subscribers">
            {list.map((s) => (
              <li key={s.contact} className="flex justify-between border-b border-line py-2">
                <span>{s.contact}</span>
                <span className="text-muted">{s.createdAt.toISOString().slice(0, 10)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
