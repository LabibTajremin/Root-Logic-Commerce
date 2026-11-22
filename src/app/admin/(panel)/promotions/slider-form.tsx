import type { Design } from '@/modules/site-settings'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, HelpHint } from '@/ui/primitives'
import { saveHeroSlider } from './slider-actions'

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 text-base'

/** Turns the poster banners into the home page's hero slider (B3). */
export const SliderForm = ({
  s,
  t,
  help,
}: {
  s: Design['heroSlider']
  t: (k: string) => string
  help: string
}) => (
  <Card>
    <ActionForm action={saveHeroSlider} className="flex flex-col gap-4" saved={t('common.saved')}>
      <h2 className="flex items-center gap-1 font-semibold">
        {t('slider.title')}
        <HelpHint id="slider" text={help} label={t('common.help')} />
      </h2>
      <label className="flex min-h-11 items-center justify-between gap-3 font-semibold">
        {t('slider.enabled')}
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={s.enabled}
          className="size-6 accent-[var(--color-accent)]"
        />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('slider.interval')}
          <input
            type="number"
            name="interval"
            min={3}
            max={10}
            defaultValue={s.interval}
            className={field}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {t('slider.effect')}
          <select name="effect" defaultValue={s.effect} className={field}>
            <option value="slide">{t('slider.slide')}</option>
            <option value="fade">{t('slider.fade')}</option>
          </select>
        </label>
      </div>
      <Button type="submit" icon="check" className="self-start">
        {t('common.save')}
      </Button>
    </ActionForm>
  </Card>
)
