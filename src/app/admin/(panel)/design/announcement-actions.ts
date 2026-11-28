'use server'

import { currentSettings } from '@/server/request'
import { act, type ActionState } from '../act'

/** One message per line (empty lines dropped); saved through the design so it's logged. */
export async function saveAnnouncement(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, store }) => {
    const { design, version } = await currentSettings()
    const messages = String(form.get('messages'))
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    await settings.saveDesign(
      store.id,
      {
        ...design,
        announcement: {
          messages,
          mode: form.get('mode'),
          link: String(form.get('link')).trim(),
          closable: form.get('closable') === 'on',
        },
      },
      version,
    )
  })
}
