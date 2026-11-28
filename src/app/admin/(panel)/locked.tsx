import Link from 'next/link'
import { Card, LockBadge } from '@/ui/primitives'

/** A paid module this shop has not got (or switched off): say so and where to get it. */
export const Locked = ({
  title,
  text,
  t,
}: {
  title: string
  text: string
  t: (k: string) => string
}) => (
  <>
    <h1 className="font-heading text-3xl">{title}</h1>
    <Card className="flex flex-col items-start gap-3">
      <LockBadge label={t('common.premium')} />
      <p className="text-sm text-muted">{text}</p>
      <Link href="/admin/plan" className="font-semibold underline">
        {t('nav.plan')}
      </Link>
    </Card>
  </>
)
