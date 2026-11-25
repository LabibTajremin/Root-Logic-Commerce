import type { Metadata } from 'next'
import Link from 'next/link'
import { ActionForm } from '@/ui/action-form'
import { Card } from '@/ui/primitives'
import { adminContext } from '../../context'
import { markParcelsPaid, setParcelAmounts } from '../actions'

export const metadata: Metadata = { title: 'Courier payouts' }

const field = 'min-h-11 w-28 rounded-control border border-line bg-surface px-3 font-normal'

/** E5: delivered parcels the couriers still owe for — collected cash, charges, and payouts. */
export default async function CourierPayoutsPage() {
  const { courier, store, t, money } = await adminContext('orders.manage')
  const { rows, collected, charges, due } = await courier.unsettled(store.id)
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3" data-testid="payout-totals">
        {(
          [
            ['courier.collected', collected],
            ['courier.charges', charges],
            ['courier.due', due],
          ] as const
        ).map(([k, v]) => (
          <Card key={k}>
            <p className="text-sm text-muted">{t(k)}</p>
            <p className="font-heading text-2xl">{money(v)}</p>
          </Card>
        ))}
      </div>
      <Card className="flex flex-col gap-3">
        {rows.length === 0 ? (
          <p className="text-sm text-muted">{t('courier.allPaid')}</p>
        ) : (
          <>
            <ul className="flex flex-col divide-y divide-line">
              {rows.map((r) => (
                <li key={r.id} className="flex flex-wrap items-end gap-3 py-3 text-sm">
                  <input
                    type="checkbox"
                    name="ids"
                    value={r.id}
                    form="payout"
                    aria-label={t('courier.selectParcel', { no: r.orderNo })}
                    className="size-6"
                  />
                  <span className="flex min-w-40 flex-col">
                    <Link href={`/admin/orders?q=${r.orderNo}`} className="font-semibold underline">
                      #{r.orderNo}
                    </Link>
                    <span className="text-muted">
                      {t(`courier.${r.provider}`)} {r.tracking} · {r.rawStatus} · COD {money(r.cod)}
                    </span>
                  </span>
                  <ActionForm action={setParcelAmounts} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="id" value={r.id} />
                    {(
                      [
                        ['collected', r.collected],
                        ['charge', r.charge ?? 0],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-1 font-semibold">
                        <label htmlFor={`${k}-${r.id}`}>
                          {t(`courier.${k}For`, { no: r.orderNo })}
                        </label>
                        <input
                          id={`${k}-${r.id}`}
                          name={k}
                          type="number"
                          min={0}
                          step="0.01"
                          defaultValue={v / 100}
                          className={field}
                        />
                      </div>
                    ))}
                    <button className="min-h-11 rounded-control border border-line px-3 font-semibold">
                      {t('common.save')}
                    </button>
                  </ActionForm>
                </li>
              ))}
            </ul>
            <ActionForm id="payout" action={markParcelsPaid} className="flex justify-end">
              <button className="min-h-11 rounded-control bg-button px-4 font-semibold text-button-text">
                {t('courier.markPaid')}
              </button>
            </ActionForm>
          </>
        )}
      </Card>
    </>
  )
}
