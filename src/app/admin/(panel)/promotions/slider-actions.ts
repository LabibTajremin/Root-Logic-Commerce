'use server'

import { currentSettings } from '@/server/request'
import { act, type ActionState } from '../act'

/** B3 settings live in the design (logged, undoable); the slides are the poster banners. */
export async function saveHeroSlider(_: ActionState, form: FormData) {
  return act('settings.manage', async ({ settings, store }) => {
    const { design, version } = await currentSettings()
    await settings.saveDesign(
      store.id,
      {
        ...design,
        heroSlider: {
          enabled: form.get('enabled') === 'on',
          interval: Number(form.get('interval')),
          effect: form.get('effect'),
        },
      },
      version,
    )
  })
}
