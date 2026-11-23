import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { helpText } from '@/help'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card, Field } from '@/ui/primitives'
import { adminContext } from '../context'
import { addBrand, updateBrand } from './actions'

export const metadata: Metadata = { title: 'Brands' }

export default async function BrandsPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const { catalog, store, locale, t } = await adminContext('products.manage')
  const all = await catalog.listBrands(store.id)
  const editing = all.find((b) => b.id === edit)
  const name = (value?: string) => (
    <Field
      id="name"
      name="name"
      required
      defaultValue={value}
      label={t('field.brandName')}
      help={helpText(locale, 'brand.name')}
      helpLabel={t('common.help')}
    />
  )
  return (
    <>
      <h1 className="font-heading text-3xl">{t('brands.title')}</h1>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        <Card className="flex flex-col gap-1">
          <ul className="peer flex flex-col divide-y divide-line">
            {all.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/admin/brands?edit=${b.id}`}
                  className="flex min-h-14 items-center gap-3"
                >
                  <span className="relative size-10 overflow-hidden rounded-control bg-soft">
                    {b.logoId && (
                      <Image
                        src={`/api/media/${b.logoId}`}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-contain"
                      />
                    )}
                  </span>
                  <span className="font-semibold">{b.name}</span>
                  {b.archived && <Badge tone="neutral">{t('categories.archived')}</Badge>}
                </Link>
              </li>
            ))}
          </ul>
          <p className="hidden text-muted peer-empty:block">{t('brands.empty')}</p>
        </Card>
        {editing ? (
          <Card>
            <ActionForm action={updateBrand} className="flex flex-col gap-4">
              <h2 className="font-semibold">{t('brands.edit')}</h2>
              <input type="hidden" name="id" value={editing.id} />
              {name(editing.name)}
              <label className="flex flex-col gap-1.5 text-sm font-semibold" htmlFor="logo">
                {t('brands.logo')}
                <input
                  id="logo"
                  name="logo"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="text-sm font-normal"
                />
              </label>
              <div className="flex gap-2">
                <Button type="submit" icon="check" className="flex-1">
                  {t('common.save')}
                </Button>
                <Button type="submit" name="archive" value="1" variant="secondary">
                  {t('categories.archive')}
                </Button>
              </div>
            </ActionForm>
          </Card>
        ) : (
          <Card>
            <ActionForm action={addBrand} className="flex flex-col gap-4">
              <h2 className="font-semibold">{t('brands.add')}</h2>
              {name()}
              <Button type="submit" icon="plus">
                {t('brands.add')}
              </Button>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  )
}
