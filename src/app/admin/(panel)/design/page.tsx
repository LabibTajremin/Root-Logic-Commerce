import type { Metadata } from 'next'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { DesignEditor } from './design-editor'

export const metadata: Metadata = { title: 'Design' }

const KEYS = [
  'preview',
  'publish',
  'theme',
  'storeName',
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
  'mobile',
  'desktop',
  'lowContrast',
  'published',
]

export default async function DesignPage() {
  const { settings, store, allowed, t } = await adminContext('settings.manage')
  if (!allowed) {
    return (
      <Card>
        <p className="text-muted">{t('error.access.denied')}</p>
      </Card>
    )
  }
  const { design, version } = await settings.get(store.id, { storeName: store.slug })
  return (
    <>
      <h1 className="font-heading text-3xl">{t('design.title')}</h1>
      <DesignEditor
        initial={design}
        version={version}
        themes={['minimal', 'organic', 'attar', 'ankito', 'attar-aloy']}
        labels={Object.fromEntries(KEYS.map((k) => [k, t(`design.${k}`)]))}
      />
    </>
  )
}
