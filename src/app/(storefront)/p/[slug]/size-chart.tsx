import type { SizeChart } from '@/modules/catalog'

/** A5: "See size chart" opens a native popover — no script needed. */
export const SizeChartButton = ({
  chart,
  labels,
}: {
  chart: SizeChart
  labels: { open: string; close: string }
}) => {
  const [head, ...body] = chart.rows
  return (
    <>
      <button
        type="button"
        popoverTarget="size-chart"
        className="self-start text-sm font-semibold underline min-h-11"
      >
        {labels.open}
      </button>
      <div
        id="size-chart"
        popover="auto"
        role="dialog"
        aria-label={chart.name}
        className="m-auto max-w-[min(92vw,40rem)] rounded-card border border-line bg-surface p-5 text-text shadow-xl backdrop:bg-black/40"
      >
        <h2 className="mb-3 font-heading text-xl">{chart.name}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {head!.map((h, i) => (
                  <th key={i} scope="col" className="border-b border-line p-2 text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, i) => (
                <tr key={i} className="border-b border-line">
                  {r.map((c, j) => (
                    <td key={j} className="p-2">
                      {c}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          popoverTarget="size-chart"
          popoverTargetAction="hide"
          className="mt-4 min-h-11 rounded-control border border-line px-4 text-sm font-semibold"
        >
          {labels.close}
        </button>
      </div>
    </>
  )
}
