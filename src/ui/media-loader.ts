// A Next convention file (images.loaderFile), so the default export is required.
// next/image loader: our own variants (or the Drive proxy) at the requested width.
export default function mediaLoader({ src, width }: { src: string; width: number }) {
  return `${src}/${width}`
}
