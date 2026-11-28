import Image from 'next/image'
import { brandImageSlots, type Design } from '@/modules/site-settings'
import { ActionForm } from '@/ui/action-form'
import { Button, Card } from '@/ui/primitives'
import { addBrandDriveImage, removeBrandImage, uploadBrandImage } from './brand-actions'

/** Logo, dark-mode logo, footer logo and favicon — upload or a Drive link, with size hints. */
export const BrandImages = ({ brand, t }: { brand: Design['brand']; t: (k: string) => string }) => (
  <Card className="flex flex-col gap-4">
    <h2 className="font-semibold">{t('brand.title')}</h2>
    <ul className="grid gap-5 md:grid-cols-2">
      {brandImageSlots.map((slot) => {
        const ref = brand[slot]
        return (
          <li key={slot} className="flex flex-col gap-2" data-testid={`brand-${slot}`}>
            <p className="font-semibold">{t(`brand.${slot}`)}</p>
            <p className="text-xs text-muted">{t(`brand.${slot}Hint`)}</p>
            {ref && (
              <div className="flex items-center gap-3">
                <span className="relative h-12 w-32 overflow-hidden rounded-control bg-soft">
                  <Image
                    src={`/api/media/${ref.id}`}
                    alt=""
                    fill
                    sizes="128px"
                    className="object-contain"
                  />
                </span>
                <ActionForm action={removeBrandImage}>
                  <input type="hidden" name="slot" value={slot} />
                  <button className="min-h-11 text-sm text-danger underline">
                    {t('media.remove')}
                  </button>
                </ActionForm>
              </div>
            )}
            <ActionForm action={uploadBrandImage} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="slot" value={slot} />
              <label className="flex flex-1 flex-col gap-1 text-sm" htmlFor={`${slot}-file`}>
                {t('media.choose')}
                <input
                  id={`${slot}-file`}
                  name="file"
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="min-h-11 rounded-control border border-line bg-surface p-2 text-sm"
                />
              </label>
              <Button icon="upload">{t('media.upload')}</Button>
            </ActionForm>
            <ActionForm action={addBrandDriveImage} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="slot" value={slot} />
              <label className="flex flex-1 flex-col gap-1 text-sm" htmlFor={`${slot}-link`}>
                {t('media.drive')}
                <input
                  id={`${slot}-link`}
                  name="link"
                  required
                  placeholder="https://drive.google.com/file/d/…"
                  className="min-h-11 rounded-control border border-line bg-surface px-3 text-sm"
                />
              </label>
              <Button variant="secondary">{t('media.add')}</Button>
            </ActionForm>
          </li>
        )
      })}
    </ul>
  </Card>
)
