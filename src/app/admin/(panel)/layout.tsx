import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { translate } from '@/i18n'
import { isAllowed } from '@/modules/access'
import { toCssVars } from '@/modules/site-settings'
import { currentActor, currentLocale, currentSettings, currentStore } from '@/server/request'
import { Icon } from '@/ui/icon'
import { LangToggle } from '@/ui/lang-toggle'
import { BottomNav, SideNav, type NavItem } from './nav'
import { SignOut } from './sign-out'

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const [actor, store, locale] = await Promise.all([
    currentActor(),
    currentStore(),
    currentLocale(),
  ])
  // Role AND tenant: a user of another store is treated as signed out here.
  if (!actor || !isAllowed(actor, 'orders.manage', store.id)) redirect('/admin/login')
  const { design } = await currentSettings()
  const t = (k: string) => translate(locale, k)
  const all: NavItem[] = [
    { href: '/admin', label: t('nav.dashboard'), icon: 'chart' },
    { href: '/admin/orders', label: t('nav.orders'), icon: 'receipt' },
    { href: '/admin/products', label: t('nav.products'), icon: 'box' },
    { href: '/admin/categories', label: t('nav.categories'), icon: 'layers' },
    { href: '/admin/stock', label: t('nav.stock'), icon: 'box' },
    { href: '/admin/promotions', label: t('nav.promotions'), icon: 'megaphone' },
    { href: '/admin/design', label: t('nav.design'), icon: 'palette' },
    { href: '/admin/messages', label: t('nav.messages'), icon: 'chat' },
    { href: '/admin/seo', label: t('nav.seo'), icon: 'trend' },
    { href: '/admin/users', label: t('nav.users'), icon: 'users' },
    { href: '/admin/plan', label: t('nav.plan'), icon: 'star' },
    { href: '/admin/help', label: t('nav.help'), icon: 'help' },
  ]
  const bottom: NavItem[] = [
    { href: '/admin', label: t('nav.home'), icon: 'home' },
    all[1]!,
    all[2]!,
    all[4]!,
    { href: '/admin/more', label: t('nav.more'), icon: 'menu' },
  ]
  return (
    <div className="flex min-h-dvh">
      {/* Admin wears the owner's brand: accent + fonts from the store design. */}
      <style>{toCssVars(design)}</style>
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line bg-surface p-4 lg:flex">
        <Link href="/admin" className="flex items-center gap-2 px-2 py-1 font-heading text-lg">
          <span className="inline-flex size-8 items-center justify-center rounded-control bg-button text-button-text">
            <Icon name="store" size={18} />
          </span>
          {design.brand.name}
        </Link>
        <nav aria-label="Admin">
          <SideNav items={all} />
        </nav>
        <p className="mt-auto px-2 text-xs text-muted">{t('common.poweredBy')}</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="flex items-center justify-end gap-2 border-b border-line px-4 py-2 lg:px-8">
          <LangToggle locale={locale} />
          <SignOut label={t('admin.signOut')} />
        </header>
        <main className="flex flex-col gap-6 p-4 lg:p-8">{children}</main>
      </div>
      <nav
        aria-label="Admin mobile"
        className="fixed inset-x-0 bottom-0 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <BottomNav items={bottom} />
      </nav>
    </div>
  )
}
