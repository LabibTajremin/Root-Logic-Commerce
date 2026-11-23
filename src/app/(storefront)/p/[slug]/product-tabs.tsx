import type { ReactNode } from 'react'
import type { ProductContent } from '@/modules/catalog'
import { Icon } from '@/ui/icon'

const Tab = ({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) => (
  <details open={open} className="group border-b border-line py-3">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between font-semibold [&::-webkit-details-marker]:hidden">
      {title}
      <Icon name="chevronRight" size={18} className="rotate-90 transition group-open:-rotate-90" />
    </summary>
    <div className="pt-2 text-sm">{children}</div>
  </details>
)

const Checks = ({ items }: { items: string[] }) => (
  <ul className="flex flex-col gap-2">
    {items.map((b) => (
      <li key={b} className="flex gap-2">
        <Icon name="check" size={18} className="shrink-0 text-success" />
        {b}
      </li>
    ))}
  </ul>
)

/** A6: the product page's content tabs; a tab with nothing in it is not shown. */
export const ProductTabs = ({
  description,
  content: c,
  t,
}: {
  description: string
  content: ProductContent
  t: (k: string) => string
}) => (
  <div className="border-t border-line">
    {description && (
      <Tab title={t('shop.tabDetails')} open>
        <div className="whitespace-pre-line text-muted">{description}</div>
      </Tab>
    )}
    {c.specs.length > 0 && (
      <Tab title={t('shop.tabSpecs')}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {c.specs.map((s) => (
            <div key={s.label} className="contents">
              <dt className="font-semibold">{s.label}</dt>
              <dd className="text-muted">{s.value}</dd>
            </div>
          ))}
        </dl>
      </Tab>
    )}
    {c.howTo.length > 0 && (
      <Tab title={t('shop.tabHowTo')}>
        <ol className="flex list-decimal flex-col gap-2 ps-5">
          {c.howTo.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Tab>
    )}
    {c.benefits.length > 0 && (
      <Tab title={t('shop.tabBenefits')}>
        <Checks items={c.benefits} />
      </Tab>
    )}
    {c.whyBuy.length > 0 && (
      <Tab title={t('shop.tabWhyBuy')}>
        <Checks items={c.whyBuy} />
      </Tab>
    )}
    {c.faq.length > 0 && (
      <Tab title={t('shop.tabFaq')}>
        <div className="flex flex-col gap-3">
          {c.faq.map((f) => (
            <div key={f.q}>
              <h3 className="font-semibold">{f.q}</h3>
              <p className="whitespace-pre-line text-muted">{f.a}</p>
            </div>
          ))}
        </div>
      </Tab>
    )}
  </div>
)
