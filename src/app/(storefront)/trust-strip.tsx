import Image from 'next/image'
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
    // Hidden by CSS until the owner fills in a number or adds a certificate.
    className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 text-sm has-[dl:empty]:has-[ul:empty]:hidden"
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
    {/* B6: certificate photos; each opens in a native popover viewer. */}
    <ul className="flex flex-wrap gap-2 empty:hidden" data-testid="certificates">
      {trust.certificates.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            popoverTarget={`cert-${c.id}`}
            className="block overflow-hidden rounded-control border border-line"
          >
            <Image
              src={`/api/media/${c.id}/320`}
              alt={c.caption}
              width={96}
              height={72}
              className="h-18 w-24 object-cover"
            />
          </button>
          <div
            id={`cert-${c.id}`}
            popover="auto"
            role="dialog"
            aria-label={c.caption}
            className="m-auto max-w-[min(92vw,48rem)] rounded-card border border-line bg-surface p-4 text-text shadow-xl backdrop:bg-black/60"
          >
            <Image
              src={`/api/media/${c.id}/1024`}
              alt={c.caption}
              width={1024}
              height={768}
              className="h-auto max-h-[80vh] w-full object-contain"
            />
            <p className="mt-2 flex items-center justify-between gap-3">
              {c.caption}
              <button
                type="button"
                popoverTarget={`cert-${c.id}`}
                popoverTargetAction="hide"
                className="min-h-11 px-3 font-semibold underline"
              >
                {t('common.close')}
              </button>
            </p>
          </div>
        </li>
      ))}
    </ul>
  </section>
)
