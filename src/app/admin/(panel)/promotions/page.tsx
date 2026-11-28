import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { helpText } from '@/help'
import type { Banner, BannerKind } from '@/modules/promotions'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card, Field, LockBadge } from '@/ui/primitives'
import { SortableList } from '@/ui/sortable-list'
import { adminContext } from '../context'
import { currentSettings } from '@/server/request'
import { addBanner, removeBanner, reorderBanners, toggleBanner } from './actions'
import { SliderForm } from './slider-form'

export const metadata: Metadata = { title: 'Promotions' }

const KINDS: BannerKind[] = ['products', 'images', 'poster', 'video', 'embed']

const summary = (b: Banner) => {
  const d = b.data
  if (d.kind === 'poster') return d.headline
  if (d.kind === 'embed') return d.url
  if (d.kind === 'video') return d.caption
  return d.message
}

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const { allowed, promotions, catalog, plans, store, locale, t } =
    await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const asked = (await searchParams).kind
  const kind = KINDS.find((k) => k === asked) ?? 'poster'
  const [banners, products, videoOk] = await Promise.all([
    promotions.list(store.id),
    catalog.listProducts(store.id, { status: 'active' }),
    plans.has(store.id, 'videoUploads'),
  ])
  const field = (id: string, label: string, props: Record<string, unknown> = {}) => (
    <Field
      id={id}
      name={id}
      label={t(label)}
      help={helpText(locale, `promotions.${kind}`)}
      helpLabel={t('common.help')}
      {...props}
    />
  )
  const file = (
    id: string,
    label: string,
    hint: string,
    accept: string,
    props: Record<string, unknown> = {},
  ) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor={id}>
      {t(label)}
      <span className="font-normal text-muted">{t(hint)}</span>
      <input
        id={id}
        name={id}
        type="file"
        accept={accept}
        className="min-h-11 rounded-control border border-line bg-surface p-2 font-normal"
        {...props}
      />
    </label>
  )
  const link = (
    <>
      {field('message', 'promotions.message', { maxLength: 120 })}
      {field('cta', 'promotions.cta', { maxLength: 30 })}
    </>
  )
  const forms: Record<BannerKind, ReactNode> = {
    products: (
      <>
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-semibold">{t('promotions.pickProducts')}</legend>
          {products.slice(0, 50).map((p) => (
            <label key={p.id} className="flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="productIds"
                value={p.id}
                className="size-5 accent-[var(--color-accent)]"
              />
              {p.name}
            </label>
          ))}
        </fieldset>
        {link}
      </>
    ),
    images: (
      <>
        {file(
          'images',
          'promotions.images',
          'promotions.imagesHint',
          'image/jpeg,image/png,image/webp',
          { multiple: true, required: true },
        )}
        {link}
        {field('href', 'promotions.href')}
      </>
    ),
    poster: (
      <>
        {field('background', 'promotions.background', { type: 'color', defaultValue: '#3C6430' })}
        {file(
          'image',
          'promotions.image',
          'promotions.imagesHint',
          'image/jpeg,image/png,image/webp',
        )}
        {field('headline', 'promotions.headline', { required: true, maxLength: 80 })}
        {field('sub', 'promotions.sub', { maxLength: 160 })}
        {field('cta', 'promotions.cta', { maxLength: 30 })}
        {field('href', 'promotions.href')}
      </>
    ),
    video: videoOk ? (
      <>
        {file('video', 'promotions.video', 'promotions.videoHint', 'video/mp4,video/webm', {
          required: true,
        })}
        {field('caption', 'promotions.caption', { maxLength: 120 })}
      </>
    ) : (
      <p className="flex flex-wrap items-center gap-2 text-sm text-muted">
        {t('promotions.videoHint')} <LockBadge label={t('common.premium')} />
      </p>
    ),
    embed: (
      <>
        {field('url', 'promotions.url', {
          type: 'url',
          required: true,
          placeholder: 'https://youtu.be/…',
        })}
        {field('caption', 'promotions.caption', { maxLength: 120 })}
      </>
    ),
  }
  return (
    <>
      <h1 className="font-heading text-3xl">{t('promotions.title')}</h1>
      <p className="text-sm text-muted">{t('promotions.hint')}</p>
      <SliderForm
        s={(await currentSettings()).design.heroSlider}
        t={t}
        help={helpText(locale, 'slider')}
      />
      {banners.length === 0 ? (
        <Card>
          <p className="text-muted">{t('promotions.empty')}</p>
        </Card>
      ) : (
        <SortableList
          handleLabel={t('common.reorder')}
          onReorder={reorderBanners}
          items={banners.map((b) => ({
            id: b.id,
            content: (
              <div
                className="flex min-w-0 flex-1 flex-wrap items-center gap-2"
                data-testid="banner-row"
              >
                <Badge tone={b.active ? 'success' : 'neutral'}>
                  {t(b.active ? 'promotions.on' : 'promotions.off')}
                </Badge>
                <span className="font-semibold">{t(`promotions.kind.${b.data.kind}`)}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-muted">{summary(b)}</span>
                <ActionForm action={toggleBanner}>
                  <input type="hidden" name="id" value={b.id} />
                  <button
                    name="active"
                    value={String(!b.active)}
                    className="min-h-11 px-2 text-sm font-semibold underline"
                  >
                    {t(b.active ? 'promotions.hide' : 'promotions.show')}
                  </button>
                </ActionForm>
                <ActionForm action={removeBanner}>
                  <input type="hidden" name="id" value={b.id} />
                  <button className="min-h-11 px-2 text-sm text-danger underline">
                    {t('promotions.delete')}
                  </button>
                </ActionForm>
              </div>
            ),
          }))}
        />
      )}
      <Card className="flex flex-col gap-4">
        <h2 className="font-semibold">{t('promotions.add')}</h2>
        <nav aria-label={t('promotions.add')} className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <Link
              key={k}
              href={`/admin/promotions?kind=${k}`}
              aria-current={k === kind ? 'page' : undefined}
              className="min-h-11 rounded-full border border-line px-4 py-2.5 text-sm font-semibold aria-[current=page]:bg-button aria-[current=page]:text-button-text"
            >
              {t(`promotions.kind.${k}`)}
            </Link>
          ))}
        </nav>
        <ActionForm
          key={kind}
          action={addBanner}
          className="flex flex-col gap-4"
          saved={t('common.saved')}
        >
          <input type="hidden" name="kind" value={kind} />
          {forms[kind]}
          <Button type="submit" icon="plus">
            {t('promotions.save')}
          </Button>
        </ActionForm>
      </Card>
    </>
  )
}
