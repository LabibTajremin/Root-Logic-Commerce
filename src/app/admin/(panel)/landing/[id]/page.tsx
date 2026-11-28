import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { landingDesigns } from '@/modules/landing'
import { isUuid } from '@/modules/shared'
import { currentSettings } from '@/server/request'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { deleteLanding, saveLanding } from '../actions'

export const metadata: Metadata = { title: 'Edit landing page' }

const field = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
const small = 'min-h-11 rounded-control border border-line px-3 text-sm font-semibold'
// Datetime-local wants the local wall time without seconds or zone.
const local = (d: Date | null) =>
  d ? new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : ''

type Props = { params: Promise<{ id: string }> }

/** H5: every block of the page in order — show or hide it, move it, change its words. */
export default async function EditLanding({ params }: Props) {
  const { id } = await params
  const [{ t, landing, store }, { business }] = await Promise.all([
    adminContext('settings.manage'),
    currentSettings(),
  ])
  if (!isUuid(id)) notFound()
  const page = await landing.list(store.id).then((all) => all.find((p) => p.id === id))
  if (!page) notFound()
  const input = (name: string, label: string, value: string, type = 'text') => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input name={name} type={type} defaultValue={value} className={field} />
    </label>
  )
  const area = (name: string, label: string, value: string) => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <textarea name={name} defaultValue={value} rows={3} className={`${field} py-2`} />
    </label>
  )
  const url = `/${business.landing.prefix}/${page.slug}`
  return (
    <>
      <h1 className="font-heading text-3xl">{page.title}</h1>
      <p className="flex flex-wrap gap-4 text-sm">
        <Link href="/admin/landing" className="underline">
          {t('common.back')}
        </Link>
        <a href={url} className="font-semibold underline">
          {t('landing.open', { url })}
        </a>
      </p>
      <ActionForm action={saveLanding} className="flex flex-col gap-4" saved={t('common.saved')}>
        <input type="hidden" name="id" value={page.id} />
        <input type="hidden" name="productId" value={page.productId} />
        <input type="hidden" name="count" value={page.blocks.length} />
        <Card className="grid gap-3 sm:grid-cols-2">
          {input('title', t('landing.pageTitle'), page.title)}
          {input('slug', t('landing.slug', { prefix: business.landing.prefix }), page.slug)}
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            {t('landing.designLabel')}
            <select name="design" defaultValue={page.design} className={field}>
              {landingDesigns.map((d) => (
                <option key={d} value={d}>
                  {t(`landing.design.${d}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col justify-end gap-2 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="siteChrome"
                defaultChecked={page.siteChrome}
                className="size-5"
              />
              {t('landing.siteChrome')}
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="hidden"
                defaultChecked={page.hidden}
                className="size-5"
              />
              {t('landing.hideFromShoppers')}
            </label>
          </div>
        </Card>
        {page.blocks.map((b, i) => {
          const name = t(`landing.kind.${b.kind}`)
          const k = (x: string) => `b${i}.${x}`
          return (
            <Card key={i} className="flex flex-col gap-3">
              <input type="hidden" name={k('kind')} value={b.kind} />
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="flex-1 font-semibold">{name}</h2>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name={k('on')} defaultChecked={b.on} className="size-5" />
                  {t('landing.showBlock', { block: name })}
                </label>
                <button
                  name="move"
                  value={`${i}:-1`}
                  aria-label={t('landing.up', { block: name })}
                  className={small}
                >
                  ↑
                </button>
                <button
                  name="move"
                  value={`${i}:1`}
                  aria-label={t('landing.down', { block: name })}
                  className={small}
                >
                  ↓
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {input(k('title'), t('landing.blockTitle', { block: name }), b.title)}
                {b.kind === 'video' && input(k('url'), t('landing.videoUrl'), b.url ?? '', 'url')}
                {b.kind === 'price' &&
                  input(k('endsAt'), t('landing.endsAt'), local(b.endsAt), 'datetime-local')}
              </div>
              {area(k('text'), t('landing.blockText', { block: name }), b.text)}
              {['whyUs', 'benefits', 'comparison', 'faq'].includes(b.kind) &&
                area(k('items'), t('landing.items', { block: name }), b.items.join('\n'))}
              {b.kind === 'packs' && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="flex flex-col gap-2">
                      {input(
                        k(`qty${j}`),
                        t('landing.packQty', { n: j + 1 }),
                        String(b.packs[j]?.qty ?? ''),
                        'number',
                      )}
                      {input(
                        k(`price${j}`),
                        t('landing.packPrice', { n: j + 1 }),
                        b.packs[j] ? String(b.packs[j]!.price / 100) : '',
                        'number',
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )
        })}
        <button className="min-h-11 w-fit rounded-control bg-button px-4 font-semibold text-button-text">
          {t('common.save')}
        </button>
      </ActionForm>
      <Card>
        <ActionForm action={deleteLanding} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={page.id} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" required className="size-5" />
            {t('landing.deleteSure')}
          </label>
          <button className="min-h-11 rounded-control border border-danger px-3 text-sm font-semibold text-danger">
            {t('landing.delete')}
          </button>
        </ActionForm>
      </Card>
    </>
  )
}
