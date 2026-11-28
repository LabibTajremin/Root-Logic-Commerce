import { TrustStrip } from './trust-strip'
import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { brandImages, toCssVars } from '@/modules/site-settings'
import { themeCss } from '@/themes'
import { LangToggle } from '@/ui/lang-toggle'
import { trackingPlan } from '@/modules/tracking'
import type { Business } from '@/modules/site-settings'
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

/** H1/H2/H3: what the browser loads — no pixel script when GTM (or nobody) sends for Meta. */
const tagsOf = (b: Business) => {
  const plan = trackingPlan(b.tracking)
  return {
    ga4: [b.ga4MeasurementId, ...b.tracking.ga4Extra].filter((x): x is string => !!x),
    gtm: b.tracking.gtm,
    metaPixels: plan.metaPixels,
    tiktok: plan.tiktokPixel,
    clarity: b.tracking.clarity,
  }
}

export const generateMetadata = async (): Promise<Metadata> => {
  const { store, business, design, t } = await storefront()
  const tr = business.tracking
  return {
    // H1/H3: domain verification for Meta Business and Search Console.
    verification: {
      ...(tr.searchConsole && { google: tr.searchConsole }),
      ...(tr.meta.domainVerification && {
        other: { 'facebook-domain-verification': tr.meta.domainVerification },
      }),
    },
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
      {/* H5: data-chrome = the shop's frame a landing page can hide (contents keeps sticky intact). */}
      <div data-chrome className="contents">
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
      </div>
      <main id="main" className="flex-1">
        {children}
      </main>
      <div data-chrome className="contents">
        {business.trust.footer && (
          <div className="mx-auto w-full max-w-6xl px-4 pb-6">
            <TrustStrip trust={business.trust} t={t} place="footer" />
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
      </div>
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
      <div data-chrome className="contents">
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
      </div>
      <Analytics tags={tagsOf(business)} />
    </div>
  )
}
