import { lineName, type OrderDetail } from '@/modules/orders'
import { Barcode } from '@/ui/barcode'
import { BrandLogo } from '@/ui/brand-logo'

export const invoiceDesigns = ['classic', 'compact', 'bold'] as const
export type InvoiceDesign = (typeof invoiceDesigns)[number]

// Each design is just a set of classes, so every one prints the same facts.
const LOOK: Record<InvoiceDesign, { head: string; body: string; table: string }> = {
  classic: { head: 'border-b border-line pb-3', body: 'gap-6 text-base', table: 'text-sm' },
  compact: { head: 'pb-1', body: 'gap-3 text-sm', table: 'text-xs' },
  bold: {
    head: 'rounded-control bg-[var(--color-accent)] p-4 text-[var(--color-accent-contrast,#fff)]',
    body: 'gap-6 text-base',
    table: 'text-sm',
  },
}

type Doc = {
  o: OrderDetail
  t: (k: string, v?: Record<string, string | number>) => string
  money: (minor: number) => string
  shop: { name: string; logo: string | null; phone: string; address: string }
  design: InvoiceDesign
}

const Head = ({ o, shop, design, title }: Doc & { title: string }) => (
  <header className={`flex items-start justify-between gap-3 ${LOOK[design].head}`}>
    <div className="flex items-center gap-3">
      <BrandLogo src={shop.logo} fallback={null} />
      <div>
        <p className="font-heading text-xl">{shop.name}</p>
        <p className="text-xs">{[shop.phone, shop.address].filter(Boolean).join(' · ')}</p>
      </div>
    </div>
    <p className="text-end text-sm font-semibold">
      {title} #{o.orderNo}
      <br />
      <span className="font-normal">
        {o.createdAt.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka' })}
      </span>
    </p>
  </header>
)

const ShipTo = ({ o, t }: Doc) => (
  <section>
    <h2 className="text-xs font-semibold uppercase">{t('invoice.billTo')}</h2>
    <p>{o.shipName}</p>
    <p>{o.shipPhone}</p>
    <p>
      {o.shipAddress}, {o.shipArea}, {o.shipDistrict}
    </p>
  </section>
)

export const InvoiceDoc = (d: Doc) => {
  const { o, t, money, design } = d
  return (
    <article
      className={`flex flex-col break-after-page bg-surface p-6 print:p-0 ${LOOK[design].body}`}
      data-testid="invoice"
    >
      <Head {...d} title={t('invoice.title')} />
      <ShipTo {...d} />
      <table className={`w-full ${LOOK[design].table}`}>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-b border-line">
              <td className="py-1.5">{lineName(i)}</td>
              <td className="py-1.5 text-end">× {i.quantity}</td>
              <td className="py-1.5 text-end">{money(i.unitPrice * i.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="pt-2 text-end">
              {t('order.delivery')}
            </td>
            <td className="pt-2 text-end">{money(o.deliveryCharge)}</td>
          </tr>
          <tr data-none={o.discount === 0} className="data-[none=true]:hidden">
            <td colSpan={2} className="pt-1 text-end">
              {[t('order.discount'), o.couponCode].filter(Boolean).join(' · ')}
            </td>
            <td className="pt-1 text-end">−{money(o.discount)}</td>
          </tr>
          <tr>
            <td colSpan={2} className="pt-1 text-end font-semibold">
              {t('order.total')} ({t('order.cod')})
            </td>
            <td className="pt-1 text-end text-lg font-semibold">{money(o.total)}</td>
          </tr>
        </tfoot>
      </table>
    </article>
  )
}

/** For the packer and the courier: what goes in the parcel, where it goes, cash to collect. */
export const PackingSlip = (d: Doc) => {
  const { o, t, money, design } = d
  return (
    <article
      className={`flex flex-col break-after-page bg-surface p-6 print:p-0 ${LOOK[design].body}`}
      data-testid="packing-slip"
    >
      <Head {...d} title={t('invoice.slip')} />
      <ShipTo {...d} />
      <ul className={`flex flex-col gap-1 ${LOOK[design].table}`}>
        {o.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-3 border-b border-line py-1">
            <span>☐ {lineName(i)}</span>
            <span className="font-semibold">× {i.quantity}</span>
          </li>
        ))}
      </ul>
      <p className="font-semibold">
        {t('invoice.collect')}: {money(o.total)}
      </p>
      <Barcode value={`#${o.orderNo}`} />
    </article>
  )
}
