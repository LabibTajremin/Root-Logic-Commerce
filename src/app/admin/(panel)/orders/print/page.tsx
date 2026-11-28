import type { Metadata } from 'next'
import { translate } from '@/i18n'
import type { OrderDetail } from '@/modules/orders'
import { formatMoney, isUuid } from '@/modules/shared'
import { brandImages } from '@/modules/site-settings'
import { currentSettings } from '@/server/request'
import { PrintButton } from '@/ui/print-button'
import { adminContext } from '../../context'
import { invoiceDesigns, InvoiceDoc, PackingSlip, type InvoiceDesign } from './documents'

export const metadata: Metadata = { title: 'Print' }

type Search = Promise<Record<string, string | string[] | undefined>>
const one = (v: string | string[] | undefined) => [v ?? ''].flat()[0]!

/** C16: invoices or packing slips for one or many orders, in a design, size and language. */
export default async function PrintPage({ searchParams }: { searchParams: Search }) {
  const q = await searchParams
  const { orders, store, t } = await adminContext('orders.manage')
  const { design, business } = await currentSettings()
  const ids = [q.ids].flat().map(String).filter(isUuid).slice(0, 100)
  const look = (invoiceDesigns.find((d) => d === one(q.design)) ?? 'classic') as InvoiceDesign
  const slip = one(q.doc) === 'slip'
  const thermal = one(q.size) === '80mm'
  const lang = one(q.lang) === 'bn' ? 'bn' : 'en'
  const found = (await Promise.all(ids.map((id) => orders.getOrder(store.id, id)))).filter(
    (o): o is OrderDetail => o !== null,
  )
  const doc = {
    t: (k: string, v?: Record<string, string | number>) => translate(lang, k, v),
    money: (m: number) =>
      formatMoney(m, { currency: business.currency, banglaDigits: lang === 'bn' }),
    shop: {
      name: design.brand.name,
      logo: brandImages(design).logo,
      phone: business.contact.phone,
      address: business.contact.address,
    },
    design: look,
  }
  const Doc = slip ? PackingSlip : InvoiceDoc
  const select = 'min-h-11 rounded-control border border-line bg-surface px-2'
  return (
    <>
      {/* 80 mm thermal rolls print one narrow column; A4 gets normal margins. */}
      <style>{thermal ? '@page{size:80mm auto;margin:3mm}' : '@page{size:A4;margin:12mm}'}</style>
      <h1 className="font-heading text-3xl print:hidden">{t('print.title')}</h1>
      <form className="flex flex-wrap items-end gap-2 print:hidden">
        {ids.map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}
        {(
          [
            ['doc', ['invoice', 'slip'], slip ? 'slip' : 'invoice'],
            ['design', invoiceDesigns, look],
            ['size', ['a4', '80mm'], thermal ? '80mm' : 'a4'],
            ['lang', ['en', 'bn'], lang],
          ] as const
        ).map(([name, values, current]) => (
          <div key={name} className="flex flex-col gap-1 text-sm font-semibold">
            <label htmlFor={`print-${name}`}>{t(`print.${name}`)}</label>
            <select id={`print-${name}`} name={name} defaultValue={current} className={select}>
              {values.map((v) => (
                <option key={v} value={v}>
                  {t(`print.${name}_${v}`)}
                </option>
              ))}
            </select>
          </div>
        ))}
        <button className="min-h-11 rounded-control border border-line px-4 text-sm font-semibold">
          {t('print.apply')}
        </button>
        <PrintButton label={t('print.print', { n: found.length })} />
      </form>
      <div
        className={`mx-auto flex w-full flex-col gap-6 ${thermal ? 'max-w-[80mm] text-xs' : 'max-w-2xl'}`}
      >
        {found.map((o) => (
          <Doc key={o.id} o={o} {...doc} />
        ))}
      </div>
    </>
  )
}
