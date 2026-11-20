import Link from 'next/link'
import { storefront } from './storefront'

export default async function NotFound() {
  const { theme, t } = await storefront()
  const { EmptyState } = theme.slots
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <EmptyState
        level={1}
        title={t('shop.notFound')}
        body={t('shop.notFoundBody')}
        action={
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-control bg-button px-6 font-semibold text-button-text"
          >
            {t('shop.home')}
          </Link>
        }
      />
    </div>
  )
}
