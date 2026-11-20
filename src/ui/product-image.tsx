import Image from 'next/image'
import type { ImageView } from '@/themes/_contract'

/** Fills its (fixed aspect-ratio) parent: any upload size fits without shifting the layout. */
export const ProductImage = ({
  image,
  sizes,
  priority = false,
}: {
  image: ImageView
  sizes: string
  priority?: boolean
}) => (
  <Image
    src={image.src}
    alt=""
    fill
    sizes={sizes}
    priority={priority}
    className="object-cover"
    style={{ backgroundColor: image.color }}
  />
)
