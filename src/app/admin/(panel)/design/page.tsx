import type { Metadata } from 'next'
import { loadTheme, themeIds } from '@/themes'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
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
  const { allowed, t } = await adminContext('settings.manage')
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
      <DesignEditor
        initial={design}
        version={version}
        themes={Object.fromEntries(themes)}
        labels={Object.fromEntries(KEYS.map((k) => [k, t(`design.${k}`)]))}
      />
    </>
  )
}
