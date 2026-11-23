import type { Business } from '@/modules/site-settings'
import { Icon } from '@/ui/icon'

const keys = ['tradeLicence', 'tin', 'bin', 'dbid'] as const

/** B6 "Verified business": the registration numbers the owner filled in. */
export const TrustStrip = ({
  trust,
  t,
}: {
  trust: Business['trust']
  t: (k: string) => string
}) => (
  <section
    aria-label={t('trust.title')}
    // Hidden by CSS until the owner fills in a number.
    className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 text-sm has-[dl:empty]:hidden"
  >
    <p className="flex items-center gap-2 font-semibold">
      <Icon name="check" size={18} className="text-success" />
      {t('trust.title')}
    </p>
    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
      {keys
        .filter((k) => trust[k])
        .map((k) => (
          <div key={k} className="flex gap-2">
            <dt className="text-muted">{t(`trust.${k}`)}</dt>
            <dd className="font-semibold">{trust[k]}</dd>
          </div>
        ))}
    </dl>
    <p className="text-muted empty:hidden">{trust.warranty}</p>
  </section>
)
