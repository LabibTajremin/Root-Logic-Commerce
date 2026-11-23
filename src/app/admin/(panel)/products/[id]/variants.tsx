import { optionsToText, variantLabel, type Product, type Variant } from '@/modules/catalog'
import { ActionForm } from '@/ui/action-form'
import { Button, Card } from '@/ui/primitives'
import { saveOptions, saveVariants } from '../variant-actions'

const taka = (minor: number | null) => (minor === null ? '' : String(minor / 100))
const cell = 'min-h-11 w-24 rounded-control border border-line bg-surface px-2'

/** A1: options (one per line) and a price/stock row for every combination. */
export const ProductVariants = ({
  product: p,
  variants,
  t,
}: {
  product: Product
  variants: Variant[]
  t: (k: string) => string
}) => (
  <Card className="flex flex-col gap-4">
    <h2 className="font-semibold">{t('variants.title')}</h2>
    <ActionForm action={saveOptions} className="flex flex-col gap-2">
      <input type="hidden" name="productId" value={p.id} />
      <label htmlFor="options" className="text-sm font-semibold">
        {t('variants.options')}
      </label>
      <p id="options-hint" className="text-xs text-muted">
        {t('variants.optionsHint')}
      </p>
      <textarea
        id="options"
        name="options"
        rows={3}
        aria-describedby="options-hint"
        defaultValue={optionsToText(p.options)}
        className="rounded-control border border-line bg-surface p-3"
      />
      <Button type="submit" variant="secondary" icon="check">
        {t('variants.saveOptions')}
      </Button>
    </ActionForm>
    {variants.length > 0 && (
      <ActionForm action={saveVariants} className="flex flex-col gap-3">
        <input type="hidden" name="productId" value={p.id} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">{t('variants.variant')}</th>
                <th className="p-2">{t('field.price')}</th>
                <th className="p-2">{t('field.compareAt')}</th>
                <th className="p-2">{t('field.cost')}</th>
                <th className="p-2">{t('field.stock')}</th>
                <th className="p-2">{t('field.sku')}</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => {
                const label = variantLabel(p.options, v.options)
                const input = (k: string, name: string, value: string, num = true) => (
                  <td className="p-1">
                    <input
                      name={`${k}-${v.id}`}
                      aria-label={`${name} — ${label}`}
                      defaultValue={value}
                      type={num ? 'number' : 'text'}
                      min={num ? 0 : undefined}
                      step={num && k !== 'stock' ? '0.01' : undefined}
                      className={cell}
                    />
                  </td>
                )
                return (
                  <tr key={v.id} className="border-t border-line">
                    <th scope="row" className="p-2 text-left font-semibold">
                      <input type="hidden" name="variant" value={v.id} />
                      {label}
                    </th>
                    {input('price', t('field.price'), taka(v.price))}
                    {input('compare', t('field.compareAt'), taka(v.compareAtPrice))}
                    {input('cost', t('field.cost'), taka(v.costPrice))}
                    {input('stock', t('field.stock'), String(v.stock))}
                    {input('sku', t('field.sku'), v.sku ?? '', false)}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <Button type="submit" icon="check">
          {t('variants.save')}
        </Button>
      </ActionForm>
    )}
  </Card>
)
