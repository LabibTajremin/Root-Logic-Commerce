import type { Metadata } from 'next'
import { Card } from '@/ui/primitives'
import { adminContext } from '../context'

export const metadata: Metadata = { title: 'Promotions' }

export default async function PromotionsPage() {
  const { t } = await adminContext('settings.manage')
  return (
    <>
      <h1 className="font-heading text-3xl">{t('promotions.title')}</h1>
      <Card>
        <p className="text-muted">{t('promotions.soon')}</p>
      </Card>
    </>
  )
}
