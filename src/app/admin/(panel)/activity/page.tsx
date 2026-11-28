import type { Metadata } from 'next'
import Link from 'next/link'
import { changedPaths, isUndoable } from '@/modules/activity'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { undoActivity } from './actions'
import { actorName, chipHref, toFilter, type ActivitySearch } from './filters'

export const metadata: Metadata = { title: 'Activity log' }

type Search = Promise<ActivitySearch>

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 text-sm'

export default async function ActivityPage({ searchParams }: { searchParams: Search }) {
  const s = await searchParams
  const { activity, access, actor, store, allowed, t } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const [{ rows, counts }, users] = await Promise.all([
    activity.list(store.id, toFilter(s)),
    access.listUsers(actor, store.id),
  ])
  const who = new Map(users.map((u) => [u.id, u.name]))
  const chip = (action: string | undefined, label: string) => (
    <Link
      key={label}
      href={chipHref(s, action)}
      aria-current={s.action === action ? 'true' : undefined}
      className="min-h-9 content-center rounded-full border border-line px-3 text-sm aria-[current]:bg-button aria-[current]:text-button-text"
    >
      {label}
    </Link>
  )
  const total = counts.reduce((n, c) => n + c.n, 0)
  return (
    <>
      <h1 className="font-heading text-3xl">{t('activity.title')}</h1>
      <p className="text-sm text-muted">{t('activity.intro')}</p>
      <nav aria-label={t('activity.filter')} className="flex flex-wrap gap-2">
        {chip(undefined, `${t('activity.all')} (${total})`)}
        {counts.map((c) => chip(c.action, `${t(`activity.action.${c.action}`)} (${c.n})`))}
      </nav>
      <form className="flex flex-wrap items-end gap-3" action="/admin/activity">
        {s.action && <input type="hidden" name="action" value={s.action} />}
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('activity.who')}
          <select name="actor" defaultValue={s.actor ?? ''} className={field}>
            <option value="">{t('activity.everyone')}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('activity.from')}
          <input type="date" name="from" defaultValue={s.from} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('activity.to')}
          <input type="date" name="to" defaultValue={s.to} className={field} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {t('activity.search')}
          <input name="q" defaultValue={s.q} className={field} />
        </label>
        <Button type="submit" variant="secondary" icon="search">
          {t('activity.apply')}
        </Button>
      </form>
      <Card>
        <ul className="peer flex flex-col divide-y divide-line">
          {rows.map((r) => (
            <li
              key={r.id}
              data-testid="activity-row"
              className="flex flex-wrap items-center gap-3 py-3"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-semibold">{t(`activity.action.${r.action}`)}</p>
                <p className="text-xs text-muted">
                  {actorName(who, r.actorId, t('activity.system'))} · {r.actorIp} ·{' '}
                  {r.createdAt.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka' })}
                </p>
                <p className="truncate text-xs text-muted">
                  {t('activity.changed')}: {changedPaths(r.before, r.after).join(', ')}
                </p>
              </div>
              {/* Only undoable changes offer the button; the server re-checks. */}
              {r.undoneAt ? (
                <Badge tone="neutral">{t('activity.undone')}</Badge>
              ) : (
                isUndoable(r.action) && (
                  <ActionForm action={undoActivity}>
                    <input type="hidden" name="id" value={r.id} />
                    <Button type="submit" variant="secondary">
                      {t('activity.undo')}
                    </Button>
                  </ActionForm>
                )
              )}
            </li>
          ))}
        </ul>
        <p className="hidden text-sm text-muted peer-empty:block">{t('activity.none')}</p>
      </Card>
    </>
  )
}
