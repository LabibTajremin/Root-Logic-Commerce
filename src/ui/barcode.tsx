import { code128 } from './code128'

/** A scannable barcode (bars alternate with spaces, starting with a bar), with the text under it. */
export const Barcode = ({ value, height = 48 }: { value: string; height?: number }) => {
  const widths = code128(value)
  const quiet = 10
  const at = (i: number) => quiet + widths.slice(0, i).reduce((a, b) => a + b, 0)
  const end = at(widths.length)
  const bars = widths.flatMap((w, i) =>
    i % 2 === 0 ? [<rect key={i} x={at(i)} y={0} width={w} height={height} />] : [],
  )
  return (
    <figure className="flex flex-col items-center gap-1">
      <svg
        viewBox={`0 0 ${end + quiet} ${height}`}
        className="h-12 w-full max-w-64 bg-white fill-black"
        role="img"
        aria-label={value}
      >
        {bars}
      </svg>
      <figcaption className="font-mono text-xs">{value}</figcaption>
    </figure>
  )
}
