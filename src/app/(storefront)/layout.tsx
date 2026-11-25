import { TrustStrip } from './trust-strip'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { brandImages, toCssVars } from '@/modules/site-settings'
import { themeCss } from '@/themes'
import { LangToggle } from '@/ui/lang-toggle'
import { Analytics } from './analytics'
import { AnnouncementBar } from './announcement-bar'
import { BottomNav } from './bottom-nav'
import { CartButton, CartDrawer } from './cart-drawer'
import { HelpBubble } from './help-bubble'
import { WishlistLink } from './wishlist-buttons'
import { helpLinks } from './help-links'
import { MiniCart } from './mini-cart'
import { exitPreview } from './preview-actions'
import { storefront } from './storefront'

export const generateMetadata = async (): Promise<Metadata> => {
  const { store, business, design, t } = await storefront()
  return {
    icons: { icon: brandImages(design).favicon },
    title: { default: store.name, template: business.seo.titleTemplate },
    description:
      business.seo.metaDescription || `${store.name} — ${t('shop.delivery')}. ${t('shop.cod')}`,
  }
}

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const {
    theme,
    design: d,
    store,
    categories,
    locale,
    business,
    moneyFormat,
    credit,
    preview,
    pages,
    on,
    t,
  } = await storefront()
  const footerPages = (await pages.published(store.id)).filter((p) => p.inFooter)
  const { Header, Footer } = theme.slots
  const k = (keys: string[]) => Object.fromEntries(keys.map((x) => [x, t(`shop.${x}`)]))
  return (
    // Style switches are data-* hooks styled in globals.css; colors/fonts are CSS variables.
    <div
      data-card={d.style.card}
      data-hover={d.style.hover}
      data-motion={d.style.motion}
      data-sticky={String(d.header.sticky)}
      data-bottom-nav={String(on('bottomNav'))}
      id="top"
      className="flex min-h-dvh flex-col"
    >
      <style>{themeCss(theme, d.mode.base) + toCssVars(d)}</style>
      {preview && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-center gap-3 bg-text px-4 py-2 text-sm text-bg"
        >
          <span>{t('layouts.previewBanner', { name: t(`layouts.preset.${preview}`) })}</span>
          <Link href="/admin/layouts" className="min-h-11 content-center font-semibold underline">
            {t('layouts.use')}
          </Link>
          <form action={exitPreview}>
            <button className="min-h-11 font-semibold underline">{t('layouts.exitPreview')}</button>
          </form>
        </div>
      )}
      {on('announcement') && d.announcement.messages.length > 0 && (
        <AnnouncementBar
          a={d.announcement}
          label={t('shop.announcements')}
          close={t('common.close')}
        />
      )}
      <Header
        store={store}
        categories={categories}
        actions={
          <>
            {business.language.switcher && <LangToggle locale={locale} />}
            {on('wishlist') && <WishlistLink label={t('wishlist.title')} />}
            <span className="rlc-header-cart">
              <CartButton label={t('shop.cart')} />
            </span>
          </>
        }
      />
      <main id="main" className="flex-1">
        {children}
      </main>
      {business.trust.footer && (
        <div className="mx-auto w-full max-w-6xl px-4 pb-6">
          <TrustStrip trust={business.trust} t={t} />
        </div>
      )}
      <Footer
        store={store}
        categories={categories}
        text={d.footer.text}
        credit={credit}
        labels={k(['shop', 'help', 'track', 'search', 'payWith', 'codShort'])}
        pages={footerPages}
        look={d.footer}
      />
      <CartDrawer
        labels={{
          ...k(['cart', 'cartEmpty', 'checkout', 'continue', 'subtotal', 'remove', 'qty']),
          close: t('common.cancel'),
          freeDelivery: t('shop.freeDelivery'),
          freeMore: t('shop.freeMore'),
        }}
        moneyFormat={moneyFormat}
        freeRule={business.freeShipping}
      />
      {on('helpBubble') && (
        <HelpBubble
          links={helpLinks(business.contact, d.floating, t)}
          label={t('shop.help')}
          top={d.floating.top ? t('shop.backToTop') : null}
          side={d.floating.side}
        />
      )}
      {on('miniCart') && (
        <MiniCart
          labels={{
            region: t('shop.miniCart'),
            items: t('shop.miniCartItems'),
            view: t('shop.viewCart'),
          }}
          moneyFormat={moneyFormat}
        />
      )}
      {on('bottomNav') && (
        <BottomNav
          labels={{
            nav: t('shop.quickNav'),
            home: t('nav.home'),
            search: t('shop.search'),
            track: t('shop.track'),
            cart: t('shop.cart'),
          }}
          items={d.mobileNav}
        />
      )}
      <Analytics ga4={business.ga4MeasurementId} />
    </div>
  )
}
