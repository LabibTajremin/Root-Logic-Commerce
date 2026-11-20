import Image from 'next/image'
import { ActionForm } from '@/ui/action-form'
import { Button, Card, Field } from '@/ui/primitives'
import { adminContext } from '../../context'
import { addDriveImage, removeImage, uploadImage } from '../media-actions'

const mb = (bytes: number) => `${(bytes / 1024 ** 2).toFixed(1)} MB`

export const ProductImages = async ({ productId }: { productId: string }) => {
  const { media, store, t } = await adminContext('products.manage')
  const [rows, usage] = await Promise.all([
    media.forProducts(store.id, [productId]),
    media.usage(store.id),
  ])
  const pct = Math.min(100, Math.round((usage.used / usage.quota) * 100))
  return (
    <Card className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-semibold">{t('media.title')}</h2>
        <p className="text-sm text-muted">{t('products.mediaHint')}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t('media.none')}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5" data-testid="product-images">
          {rows.map(({ media: m }) => (
            <li key={m.id} className="flex flex-col gap-2">
              <span className="relative aspect-square overflow-hidden rounded-control bg-soft">
                <Image
                  src={`/api/media/${m.id}`}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover"
                  style={{ backgroundColor: m.dominantColor }}
                />
              </span>
              <ActionForm action={removeImage}>
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="mediaId" value={m.id} />
                <button className="min-h-11 w-full text-sm text-danger underline">
                  {t('media.remove')}
                </button>
              </ActionForm>
            </li>
          ))}
        </ul>
      )}
      <ActionForm action={uploadImage} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="productId" value={productId} />
        <label className="flex flex-1 flex-col gap-1.5 text-sm font-semibold" htmlFor="image-file">
          {t('media.choose')}
          <input
            id="image-file"
            name="file"
            type="file"
            required
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="min-h-11 rounded-control border border-line bg-surface p-2 text-sm font-normal"
          />
        </label>
        <Button icon="upload">{t('media.upload')}</Button>
      </ActionForm>
      <ActionForm action={addDriveImage} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="productId" value={productId} />
        <Field
          id="drive-link"
          name="link"
          label={t('media.drive')}
          help={t('media.driveHint')}
          helpLabel={t('common.help')}
          required
          className="flex-1"
          placeholder="https://drive.google.com/file/d/…"
        />
        <Button variant="secondary">{t('media.add')}</Button>
      </ActionForm>
      <div className="flex flex-col gap-1.5" data-testid="storage-usage">
        <p className="text-sm">
          {t('media.usage', { used: mb(usage.used), quota: mb(usage.quota) })}
        </p>
        <div className="h-2 overflow-hidden rounded-full bg-soft" aria-hidden>
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Card>
  )
}
