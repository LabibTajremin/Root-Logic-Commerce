import type { Category, Product } from '@/modules/catalog'
import { helpText } from '@/help'
import type { Locale } from '@/i18n'
import { translate } from '@/i18n'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, Field, HelpHint } from '@/ui/primitives'
import { saveProduct } from './actions'

const taka = (minor: number | null | undefined) =>
  minor === null || minor === undefined ? '' : String(minor / 100)

export const ProductForm = ({
  product,
  categories,
  locale,
}: {
  product?: Product
  categories: Category[]
  locale: Locale
}) => {
  const t = (k: string) => translate(locale, k)
  const f = (id: string, label: string, props: Record<string, unknown> = {}) => (
    <Field
      id={id}
      name={id}
      label={t(label)}
      help={helpText(
        locale,
        `product.${id === 'compareAtPrice' ? 'compareAt' : id === 'costPrice' ? 'cost' : id === 'lowStockThreshold' ? 'lowStock' : id}`,
      )}
      helpLabel={t('common.help')}
      {...props}
    />
  )
  const select = 'min-h-11 rounded-control border border-line bg-surface px-3'
  return (
    <ActionForm action={saveProduct} className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4">
          {f('name', 'field.name', { required: true, defaultValue: product?.name })}
          {f('slug', 'field.slug', { defaultValue: product?.slug, pattern: '[a-z0-9\\-]+' })}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <label htmlFor="description" className="text-sm font-semibold">
                {t('field.description')}
              </label>
              <HelpHint
                id="description"
                text={helpText(locale, 'product.description')}
                label={t('common.help')}
              />
            </div>
            <textarea
              id="description"
              name="description"
              rows={5}
              defaultValue={product?.description}
              className="rounded-control border border-line bg-surface p-3"
            />
          </div>
        </Card>
        <Card className="flex flex-col gap-2">
          <h2 className="font-semibold">{t('products.media')}</h2>
          <p className="text-sm text-muted">{t('products.mediaHint')}</p>
        </Card>
        <Card className="flex flex-col gap-4">
          {f('seoTitle', 'field.seoTitle', {
            defaultValue: product?.seoTitle ?? '',
            maxLength: 70,
          })}
          {f('seoDescription', 'field.seoDescription', {
            defaultValue: product?.seoDescription ?? '',
            maxLength: 170,
          })}
        </Card>
      </div>
      <div className="flex flex-col gap-5">
        <Card className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <label htmlFor="status" className="text-sm font-semibold">
                {t('field.status')}
              </label>
              <HelpHint
                id="status"
                text={helpText(locale, 'product.status')}
                label={t('common.help')}
              />
            </div>
            <select
              id="status"
              name="status"
              defaultValue={product?.status ?? 'active'}
              className={select}
            >
              {(['draft', 'active', 'archived'] as const).map((s) => (
                <option key={s} value={s}>
                  {t(`status.${s}`)}
                </option>
              ))}
            </select>
          </div>
          {f('price', 'field.price', {
            type: 'number',
            min: 0,
            step: '0.01',
            required: true,
            defaultValue: taka(product?.price),
          })}
          {f('compareAtPrice', 'field.compareAt', {
            type: 'number',
            min: 0,
            step: '0.01',
            defaultValue: taka(product?.compareAtPrice),
          })}
          {f('costPrice', 'field.cost', {
            type: 'number',
            min: 0,
            step: '0.01',
            defaultValue: taka(product?.costPrice),
          })}
          {f('stock', 'field.stock', { type: 'number', min: 0, defaultValue: product?.stock ?? 0 })}
          {f('lowStockThreshold', 'field.lowStock', {
            type: 'number',
            min: 0,
            defaultValue: product?.lowStockThreshold ?? 5,
          })}
          {f('sku', 'field.sku', { defaultValue: product?.sku ?? '' })}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1">
              <label htmlFor="categoryId" className="text-sm font-semibold">
                {t('field.category')}
              </label>
              <HelpHint
                id="categoryId"
                text={helpText(locale, 'product.category')}
                label={t('common.help')}
              />
            </div>
            <select
              id="categoryId"
              name="categoryId"
              defaultValue={product?.categoryId ?? ''}
              className={select}
            >
              <option value="">{t('common.none')}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" icon="check">
            {t('common.save')}
          </Button>
        </Card>
      </div>
    </ActionForm>
  )
}
