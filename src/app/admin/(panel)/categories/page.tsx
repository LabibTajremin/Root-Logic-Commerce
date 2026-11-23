import type { Metadata } from 'next'
import Link from 'next/link'
import { helpText } from '@/help'
import type { Category } from '@/modules/catalog'
import { ActionForm } from '@/ui/action-form'
import { Badge, Button, Card, Field, HelpHint } from '@/ui/primitives'
import { SortableList } from '@/ui/sortable-list'
import { adminContext } from '../context'
import { addCategory, reorderCategories, updateCategory } from './actions'

export const metadata: Metadata = { title: 'Categories' }

// Parents first, each followed by its children — the order shoppers see in the menu.
const flatten = (
  all: Category[],
  parentId: string | null = null,
  depth = 0,
): { c: Category; depth: number }[] =>
  all
    .filter((c) => c.parentId === parentId)
    .flatMap((c) => [{ c, depth }, ...flatten(all, c.id, depth + 1)])

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const { edit } = await searchParams
  const { catalog, store, locale, t } = await adminContext('products.manage')
  const all = await catalog.listCategories(store.id)
  const charts = await catalog.listSizeCharts(store.id)
  const chartSelect = (current: string | null) => (
    <div className="flex flex-col gap-1.5 text-sm font-semibold">
      <label htmlFor="sizeChartId">{t('field.sizeChart')}</label>
      <select
        id="sizeChartId"
        name="sizeChartId"
        defaultValue={current ?? ''}
        className="min-h-11 rounded-control border border-line bg-surface px-3 font-normal"
      >
        <option value="">{t('common.none')}</option>
        {charts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  )
  const rows = flatten(all)
  const editing = all.find((c) => c.id === edit)
  const parentSelect = (current: string | null, exclude?: string) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1">
        <label htmlFor="parentId" className="text-sm font-semibold">
          {t('field.parent')}
        </label>
        <HelpHint
          id="parentId"
          text={helpText(locale, 'category.parent')}
          label={t('common.help')}
        />
      </div>
      <select
        id="parentId"
        name="parentId"
        defaultValue={current ?? ''}
        className="min-h-11 rounded-control border border-line bg-surface px-3"
      >
        <option value="">{t('common.none')}</option>
        {all
          .filter((c) => c.id !== exclude)
          .map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
      </select>
    </div>
  )
  return (
    <>
      <h1 className="font-heading text-3xl">{t('categories.title')}</h1>
      <p className="text-sm text-muted">{t('categories.hint')}</p>
      <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
        {rows.length === 0 ? (
          <Card>
            <p className="text-muted">{t('categories.empty')}</p>
          </Card>
        ) : (
          <SortableList
            handleLabel={t('common.reorder')}
            onReorder={reorderCategories}
            items={rows.map(({ c, depth }) => ({
              id: c.id,
              indent: depth,
              content: (
                <Link
                  href={`/admin/categories?edit=${c.id}`}
                  className="flex min-h-11 flex-1 items-center gap-3"
                >
                  <span className="font-semibold">{c.name}</span>
                  {c.archived && <Badge tone="neutral">{t('categories.archived')}</Badge>}
                </Link>
              ),
            }))}
          />
        )}
        {editing ? (
          <Card>
            <ActionForm action={updateCategory} className="flex flex-col gap-4">
              <h2 className="font-semibold">{t('categories.edit')}</h2>
              <input type="hidden" name="id" value={editing.id} />
              <Field
                id="name"
                name="name"
                required
                defaultValue={editing.name}
                label={t('field.categoryName')}
                help={helpText(locale, 'category.name')}
                helpLabel={t('common.help')}
              />
              {parentSelect(editing.parentId, editing.id)}
              {chartSelect(editing.sizeChartId)}
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
            <ActionForm action={addCategory} className="flex flex-col gap-4">
              <h2 className="font-semibold">{t('categories.add')}</h2>
              <Field
                id="name"
                name="name"
                required
                label={t('field.categoryName')}
                help={helpText(locale, 'category.name')}
                helpLabel={t('common.help')}
              />
              {parentSelect(null)}
              {chartSelect(null)}
              <Button type="submit" icon="plus">
                {t('categories.add')}
              </Button>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  )
}
