import Image from 'next/image'
import type { ReactNode } from 'react'

/** The owner's logo when uploaded, else the theme's own mark. Alt is empty: the name sits beside it. */
export const BrandLogo = ({ src, fallback }: { src: string | null; fallback: ReactNode }) =>
  src ? (
    <Image
      src={src}
      alt=""
      width={160}
      height={48}
      sizes="160px"
      className="h-10 w-auto max-w-40 object-contain"
    />
  ) : (
    fallback
  )
