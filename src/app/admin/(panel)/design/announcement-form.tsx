import type { Design } from '@/modules/site-settings'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, HelpHint } from '@/ui/primitives'
import { saveAnnouncement } from './announcement-actions'

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 text-base'

/** B1 settings: up to five short messages, rotate or scroll, optional link and close button. */
export const AnnouncementForm = ({
  a,
  t,
  help,
}: {
  a: Design['announcement']
  t: (k: string) => string
  help: string
}) => (
  <Card>
    <ActionForm action={saveAnnouncement} className="flex flex-col gap-4" saved={t('common.saved')}>
      <h2 className="flex items-center gap-1 font-semibold">
        {t('announce.title')}
        <HelpHint id="announce" text={help} label={t('common.help')} />
      </h2>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {t('announce.messages')}
        <textarea
          name="messages"
          rows={4}
          defaultValue={a.messages.join('\n')}
          className={`${field} py-2`}
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('announce.mode')}
          <select name="mode" defaultValue={a.mode} className={field}>
            <option value="rotate">{t('announce.rotate')}</option>
            <option value="marquee">{t('announce.marquee')}</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('announce.link')}
          <input name="link" defaultValue={a.link} placeholder="/c/eid-offer" className={field} />
        </label>
      </div>
      <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
        {t('announce.closable')}
        <input
          type="checkbox"
          name="closable"
          defaultChecked={a.closable}
          className="size-6 accent-[var(--color-accent)]"
        />
      </label>
      <Button type="submit" icon="check" className="self-start">
        {t('common.save')}
      </Button>
    </ActionForm>
  </Card>
)
