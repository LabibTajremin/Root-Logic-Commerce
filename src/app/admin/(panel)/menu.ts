import type { IconName } from '@/ui/icon'

export type MenuItem = { href: string; key: string; icon: IconName }
export type MenuGroup = { key: string; items: MenuItem[] }
export const adminModes = ['simple', 'pro'] as const
export type AdminMode = (typeof adminModes)[number]

/** Every admin screen, grouped the way owners think about their shop. */
export const menuGroups: MenuGroup[] = [
  {
    key: 'nav.group.sell',
    items: [
      { href: '/admin', key: 'nav.dashboard', icon: 'chart' },
      { href: '/admin/orders', key: 'nav.orders', icon: 'receipt' },
      { href: '/admin/products', key: 'nav.products', icon: 'box' },
      { href: '/admin/categories', key: 'nav.categories', icon: 'layers' },
      { href: '/admin/brands', key: 'nav.brands', icon: 'star' },
      { href: '/admin/size-charts', key: 'nav.sizeCharts', icon: 'grip' },
      { href: '/admin/reviews', key: 'nav.reviews', icon: 'star' },
      { href: '/admin/stock', key: 'nav.stock', icon: 'box' },
      { href: '/admin/promotions', key: 'nav.promotions', icon: 'megaphone' },
      { href: '/admin/coupons', key: 'nav.coupons', icon: 'receipt' },
      { href: '/admin/fraud', key: 'nav.fraud', icon: 'alert' },
    ],
  },
  {
    key: 'nav.group.design',
    items: [
      { href: '/admin/design', key: 'nav.design', icon: 'palette' },
      { href: '/admin/layouts', key: 'nav.layouts', icon: 'home' },
      { href: '/admin/pages', key: 'nav.pages', icon: 'store' },
      { href: '/admin/texts', key: 'nav.texts', icon: 'edit' },
      { href: '/admin/seo', key: 'nav.seo', icon: 'trend' },
    ],
  },
  {
    key: 'nav.group.settings',
    items: [
      { href: '/admin/store', key: 'store.title', icon: 'store' },
      { href: '/admin/notifications', key: 'notices.title', icon: 'alert' },
      { href: '/admin/messages', key: 'nav.messages', icon: 'chat' },
      { href: '/admin/users', key: 'nav.users', icon: 'users' },
      { href: '/admin/activity', key: 'activity.title', icon: 'trend' },
      { href: '/admin/features', key: 'nav.features', icon: 'layers' },
      { href: '/admin/plan', key: 'nav.plan', icon: 'star' },
      { href: '/admin/help', key: 'nav.help', icon: 'help' },
    ],
  },
]

// Simple mode (spec §12.2): the everyday screens only — dashboard doubles as reports.
const SIMPLE = new Set([
  '/admin',
  '/admin/orders',
  '/admin/products',
  '/admin/stock',
  '/admin/messages',
  '/admin/design',
  '/admin/help',
])

export const adminMenu = (mode: AdminMode) =>
  menuGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => mode === 'pro' || SIMPLE.has(i.href)) }))
    .filter((g) => g.items.length > 0)

export const isAdminMode = (v: unknown): v is AdminMode => v === 'simple' || v === 'pro'
