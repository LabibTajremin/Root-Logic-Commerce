import type { Metadata } from 'next'
import { helpText } from '@/help'
import { loadTheme, themeIds } from '@/themes'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { AnnouncementForm } from './announcement-form'
import { BrandImages } from './brand-images'
import { DesignEditor } from './design-editor'
import { currentSettings } from '@/server/request'

export const metadata: Metadata = { title: 'Design' }

const KEYS = [
  'preview',
  'publish',
  'theme',
  'storeName',
  'showName',
  'nameFont',
  'siteFont',
  'colors',
  'accent',
  'button',
  'header',
  'text',
  'mode',
  'lightBg',
  'darkBg',
  'warmth',
  'visitorToggle',
  'pattern',
  'patternOpacity',
  'headerOpacity',
  'sticky',
  'card',
  'showcase',
  'hover',
  'motion',
  'productCard',
  'colsMobile',
  'colsDesktop',
  'cardShape',
  'card_badges',
  'card_oldPrice',
  'card_button',
  'gallery',
  'galleryFit',
  'galleryThumbs',
  'floating',
  'floatSide',
  'float_whatsapp',
  'float_messenger',
  'float_call',
  'float_top',
  'mobileNav',
  'mnav_search',
  'mnav_track',
  'mnav_cart',
  'footer',
  'footerStyle',
  'footer_categories',
  'footer_help',
  'footer_payments',
  'mobile',
  'desktop',
  'lowContrast',
  'published',
]

export default async function DesignPage() {
  const { allowed, locale, t } = await adminContext('settings.manage')
  if (!allowed) {
    return (
      <Card>
        <p className="text-muted">{t('error.access.denied')}</p>
      </Card>
    )
  }
  const { design, version } = await currentSettings()
  const themes = await Promise.all(themeIds.map(async (id) => [id, (await loadTheme(id)).defaults]))
  return (
    <>
      <h1 className="font-heading text-3xl">{t('design.title')}</h1>
      <BrandImages brand={design.brand} t={t} />
      <AnnouncementForm a={design.announcement} t={t} help={helpText(locale, 'announce')} />
      {/* J1: the checkout, order buttons and thank-you page are set where their rules live. */}
      <Card className="flex flex-col gap-2">
        <h2 className="font-semibold">{t('design.ordering')}</h2>
        <p className="text-sm text-muted">{t('design.orderingHint')}</p>
        <ul className="flex flex-wrap gap-2">
          {(
            [
              ['order-buttons', 'store.pathsTitle'],
              ['checkout-fields', 'store.checkoutFields'],
              ['thank-you', 'store.thanksTitle'],
            ] as const
          ).map(([id, key]) => (
            <li key={id}>
              <a
                href={`/admin/store#${id}`}
                className="inline-flex min-h-11 items-center rounded-control border border-line px-4 text-sm font-semibold"
              >
                {t(key)}
              </a>
            </li>
          ))}
        </ul>
      </Card>
      <DesignEditor
        initial={design}
        version={version}
        themes={Object.fromEntries(themes)}
        labels={Object.fromEntries(KEYS.map((k) => [k, t(`design.${k}`)]))}
      />
    </>
  )
}
