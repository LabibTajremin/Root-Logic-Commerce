import { cookies } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { translate } from '@/i18n'
import { isAllowed } from '@/modules/access'
import { toCssVars } from '@/modules/site-settings'
import { currentActor, currentLocale, currentSettings, currentStore } from '@/server/request'
import { Icon } from '@/ui/icon'
import { LangToggle } from '@/ui/lang-toggle'
import { CommandPalette } from './command-palette'
import { adminMenu, isAdminMode, menuGroups } from './menu'
import { BottomNav, ModeToggle, SideNav, type NavGroup, type NavItem } from './nav'
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
  const saved = (await cookies()).get('admin-mode')?.value
  const mode = isAdminMode(saved) ? saved : 'simple'
  const groups: NavGroup[] = adminMenu(mode).map((g) => ({
    label: t(g.key),
    items: g.items.map((i) => ({ href: i.href, label: t(i.key), icon: i.icon })),
  }))
  const item = (href: string) => groups.flatMap((g) => g.items).find((i) => i.href === href)!
  const bottom: NavItem[] = [
    { href: '/admin', label: t('nav.home'), icon: 'home' },
    item('/admin/orders'),
    item('/admin/products'),
    item('/admin/stock'),
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
        <ModeToggle
          mode={mode}
          labels={{ label: t('nav.mode'), simple: t('nav.simple'), pro: t('nav.pro') }}
        />
        <nav aria-label="Admin">
          <SideNav groups={groups} />
        </nav>
        <p className="mt-auto px-2 text-xs text-muted">{t('common.poweredBy')}</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col pb-20 lg:pb-0">
        <header className="flex items-center justify-end gap-2 border-b border-line px-4 py-2 lg:px-8">
          <CommandPalette
            menu={menuGroups.flatMap((g) =>
              g.items.map((i) => ({ href: i.href, label: t(i.key), detail: t(g.key) })),
            )}
            labels={{
              open: t('search.open'),
              placeholder: t('search.placeholder'),
              menus: t('search.menus'),
              orders: t('nav.orders'),
              products: t('nav.products'),
              none: t('search.none'),
            }}
          />
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
