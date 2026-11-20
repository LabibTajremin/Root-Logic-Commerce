import type { Metadata } from 'next'
import { helpText } from '@/help'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card, Field, HelpHint } from '@/ui/primitives'
import { adminContext } from '../context'
import { inviteUser, setRole } from './actions'

export const metadata: Metadata = { title: 'Users & roles' }

export default async function UsersPage() {
  const { access, store, actor, allowed, locale, t } = await adminContext('users.manage')
  if (!allowed) {
    return (
      <>
        <h1 className="font-heading text-3xl">{t('users.title')}</h1>
        <Card>
          <p className="text-muted">{t('users.ownerOnly')}</p>
        </Card>
      </>
    )
  }
  const users = await access.listUsers(actor, store.id)
  return (
    <>
      <h1 className="font-heading text-3xl">{t('users.title')}</h1>
      <p className="text-sm text-muted">{t('users.roles')}</p>
      <div className="grid gap-5 lg:grid-cols-[1fr_400px]">
        <ul className="flex flex-col gap-3">
          {users.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-surface p-4"
            >
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{u.name}</span>
                <span className="block truncate text-sm text-muted">{u.email}</span>
              </span>
              <Badge tone={u.role === 'OWNER' ? 'accent' : 'neutral'}>{t(`role.${u.role}`)}</Badge>
              {u.id !== actor!.id && (
                <ActionForm action={setRole}>
                  <input type="hidden" name="userId" value={u.id} />
                  <input type="hidden" name="role" value={u.role === 'OWNER' ? 'STAFF' : 'OWNER'} />
                  <Button type="submit" variant="secondary">
                    {t(u.role === 'OWNER' ? 'users.makeStaff' : 'users.makeOwner')}
                  </Button>
                </ActionForm>
              )}
            </li>
          ))}
        </ul>
        <Card>
          <ActionForm action={inviteUser} className="flex flex-col gap-4" saved={t('common.saved')}>
            <h2 className="font-semibold">{t('users.invite')}</h2>
            <Field
              id="name"
              name="name"
              required
              label={t('field.fullName')}
              help={helpText(locale, 'user.name')}
              helpLabel={t('common.help')}
            />
            <Field
              id="email"
              name="email"
              type="email"
              required
              label={t('field.email')}
              help={helpText(locale, 'user.email')}
              helpLabel={t('common.help')}
            />
            <Field
              id="password"
              name="password"
              type="text"
              required
              minLength={8}
              label={t('field.tempPassword')}
              help={helpText(locale, 'user.password')}
              helpLabel={t('common.help')}
            />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1">
                <label htmlFor="role" className="text-sm font-semibold">
                  {t('users.role')}
                </label>
                <HelpHint id="role" text={helpText(locale, 'user.role')} label={t('common.help')} />
              </div>
              <select
                id="role"
                name="role"
                className="min-h-11 rounded-control border border-line bg-surface px-3"
              >
                <option value="STAFF">{t('role.STAFF')}</option>
                <option value="OWNER">{t('role.OWNER')}</option>
              </select>
            </div>
            <Button type="submit" icon="plus">
              {t('users.invite')}
            </Button>
          </ActionForm>
        </Card>
      </div>
    </>
  )
}
