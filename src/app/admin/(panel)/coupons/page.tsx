import type { Metadata } from 'next'
import Link from 'next/link'
import { couponKinds, type Coupon } from '@/modules/coupons'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card } from '@/ui/primitives'
import { adminContext } from '../context'
import { saveCoupon } from './actions'

export const metadata: Metadata = { title: 'Coupons' }

const box = 'min-h-11 rounded-control border border-line bg-surface px-3 font-normal'
const dhakaDay = (d: Date | null) =>
  d ? d.toLocaleDateString('en-CA', { timeZone: 'Asia/Dhaka' }) : ''

/** C2: discount codes — percent, fixed or free shipping, with limits and dates. */
export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const { allowed, coupons, catalog, store, t, money } = await adminContext('settings.manage')
  if (!allowed) return <p className="text-muted">{t('error.access.denied')}</p>
  const [all, products, categories] = await Promise.all([
    coupons.list(store.id),
    catalog.listProducts(store.id),
    catalog.listCategories(store.id),
  ])
  const c: Coupon | undefined = all.find((x) => x.id === edit)
  const field = (id: string, label: string, input: React.ReactNode) => (
    <div className="flex flex-col gap-1.5 text-sm font-semibold">
      <label htmlFor={id}>{label}</label>
      {input}
    </div>
  )
  const describe = (x: Coupon) =>
    x.kind === 'percent'
      ? `${x.value}%`
      : x.kind === 'fixed'
        ? money(x.value)
        : t('coupons.kind_free_shipping')
  return (
    <>
      <h1 className="font-heading text-3xl">{t('coupons.title')}</h1>
      <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
        <Card>
          <ul className="peer flex flex-col divide-y divide-line">
            {all.map((x) => (
              <li key={x.id}>
                <Link
                  href={`/admin/coupons?edit=${x.id}`}
                  className="flex min-h-14 flex-wrap items-center gap-3"
                >
                  <span className="font-mono font-semibold">{x.code}</span>
                  <span className="text-sm text-muted">{describe(x)}</span>
                  <span className="text-sm text-muted">{t('coupons.usedN', { n: x.used })}</span>
                  <Badge tone={x.active ? 'success' : 'neutral'}>
                    {t(x.active ? 'features.on' : 'features.off')}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
          <p className="hidden text-muted peer-empty:block">{t('coupons.empty')}</p>
        </Card>
        <Card>
          <ActionForm action={saveCoupon} className="flex flex-col gap-3">
            <h2 className="font-semibold">{t(c ? 'coupons.edit' : 'coupons.add')}</h2>
            <input type="hidden" name="id" value={c?.id ?? ''} />
            {field(
              'code',
              t('coupons.code'),
              <input
                id="code"
                name="code"
                required
                defaultValue={c?.code}
                className={`${box} uppercase`}
              />,
            )}
            {field(
              'kind',
              t('coupons.kind'),
              <select id="kind" name="kind" defaultValue={c?.kind ?? 'percent'} className={box}>
                {couponKinds.map((k) => (
                  <option key={k} value={k}>
                    {t(`coupons.kind_${k}`)}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'value',
              t('coupons.value'),
              <input
                id="value"
                name="value"
                type="number"
                min={0}
                step="0.01"
                defaultValue={c ? (c.kind === 'fixed' ? c.value / 100 : c.value) : ''}
                className={box}
              />,
            )}
            {field(
              'minSubtotal',
              t('coupons.minSubtotal'),
              <input
                id="minSubtotal"
                name="minSubtotal"
                type="number"
                min={0}
                defaultValue={c ? c.minSubtotal / 100 : ''}
                className={box}
              />,
            )}
            <div className="grid grid-cols-2 gap-3">
              {field(
                'startsAt',
                t('coupons.startsAt'),
                <input
                  id="startsAt"
                  name="startsAt"
                  type="date"
                  defaultValue={dhakaDay(c?.startsAt ?? null)}
                  className={box}
                />,
              )}
              {field(
                'endsAt',
                t('coupons.endsAt'),
                <input
                  id="endsAt"
                  name="endsAt"
                  type="date"
                  defaultValue={dhakaDay(c?.endsAt ?? null)}
                  className={box}
                />,
              )}
              {field(
                'totalLimit',
                t('coupons.totalLimit'),
                <input
                  id="totalLimit"
                  name="totalLimit"
                  type="number"
                  min={1}
                  defaultValue={c?.totalLimit ?? ''}
                  className={box}
                />,
              )}
              {field(
                'perPhoneLimit',
                t('coupons.perPhoneLimit'),
                <input
                  id="perPhoneLimit"
                  name="perPhoneLimit"
                  type="number"
                  min={1}
                  defaultValue={c?.perPhoneLimit ?? ''}
                  className={box}
                />,
              )}
            </div>
            {field(
              'productIds',
              t('coupons.products'),
              <select
                id="productIds"
                name="productIds"
                multiple
                defaultValue={c?.productIds}
                className={`${box} min-h-24 py-2`}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>,
            )}
            {field(
              'categoryIds',
              t('coupons.categories'),
              <select
                id="categoryIds"
                name="categoryIds"
                multiple
                defaultValue={c?.categoryIds}
                className={`${box} min-h-24 py-2`}
              >
                {categories.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </select>,
            )}
            <p className="text-xs text-muted">{t('coupons.scopeHint')}</p>
            {(['autoApply', 'active'] as const).map((k) => (
              <label
                key={k}
                className="flex min-h-11 items-center justify-between gap-3 text-sm font-semibold"
              >
                {t(`coupons.${k}`)}
                <input
                  type="checkbox"
                  name={k}
                  defaultChecked={c ? c[k] : k === 'active'}
                  className="size-6 accent-[var(--color-accent)]"
                />
              </label>
            ))}
            <Button type="submit" icon="check">
              {t('common.save')}
            </Button>
          </ActionForm>
        </Card>
      </div>
    </>
  )
}
