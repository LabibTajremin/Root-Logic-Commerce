import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { toCssVars } from '@/modules/site-settings'
import { themeCss } from '@/themes'
import { LangToggle } from '@/ui/lang-toggle'
import { CartButton, CartDrawer } from './cart-drawer'
import { storefront } from './storefront'

export const generateMetadata = async (): Promise<Metadata> => {
  const { store, business } = await storefront()
  return {
    title: { default: store.name, template: business.seo.titleTemplate },
    description: business.seo.metaDescription || undefined,
  }
}

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const { theme, design: d, store, categories, locale, business, credit, t } = await storefront()
  const { Header, Footer } = theme.slots
  const k = (keys: string[]) => Object.fromEntries(keys.map((x) => [x, t(`shop.${x}`)]))
  return (
    // Style switches are data-* hooks styled in globals.css; colors/fonts are CSS variables.
    <div
      data-card={d.style.card}
      data-hover={d.style.hover}
      data-motion={d.style.motion}
      data-sticky={String(d.header.sticky)}
      className="flex min-h-dvh flex-col"
    >
      <style>{themeCss(theme, d.mode.base) + toCssVars(d)}</style>
      <Header
        store={store}
        categories={categories}
        actions={
          <>
            <LangToggle locale={locale} />
            <CartButton label={t('shop.cart')} />
          </>
        }
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer
        store={store}
        categories={categories}
        text={d.footer.text}
        credit={credit}
        labels={k(['shop', 'help', 'track', 'search'])}
      />
      <CartDrawer
        labels={{
          ...k(['cart', 'cartEmpty', 'checkout', 'continue', 'subtotal', 'remove', 'qty']),
          close: t('common.cancel'),
        }}
        banglaDigits={business.banglaDigits}
      />
    </div>
  )
}
