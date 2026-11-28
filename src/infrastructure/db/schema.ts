import type { OrderSource } from '@/modules/orders'
import type { CourierProvider, ParcelState, SessionKind } from '@/modules/courier'
import {
  type AnyPgColumn,
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { ProductContent, ProductOptions, VariantOptions } from '@/modules/catalog'
import type { LandingBlock, LandingDesign } from '@/modules/landing'

const id = () => uuid().primaryKey().defaultRandom()
const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow()
const updatedAt = () => timestamp({ withTimezone: true }).notNull().defaultNow()
const storeId = () =>
  uuid()
    .notNull()
    .references(() => stores.id, { onDelete: 'cascade' })

export const roleEnum = pgEnum('role', ['SUPER_ADMIN', 'OWNER', 'STAFF'])
export const productStatusEnum = pgEnum('product_status', ['draft', 'active', 'archived'])
export const orderStatusEnum = pgEnum('order_status', [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  // C13 (appended: Postgres enums only grow at the end without a rewrite).
  'ON_HOLD',
  'SCHEDULED',
  'COURIER_HOLD',
  'PARTIAL_DELIVERED',
  'RETURNING',
  'RETURN_RECEIVED',
  'RETURN_MISSING',
])
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'paid', 'refunded'])
export const stockReasonEnum = pgEnum('stock_reason', [
  'order_confirmed',
  'order_restocked',
  'manual',
])
export const reviewStatusEnum = pgEnum('review_status', ['pending', 'approved', 'rejected'])
export const outboxStatusEnum = pgEnum('outbox_status', ['pending', 'sent', 'failed'])
export const channelEnum = pgEnum('channel', ['email', 'sms', 'whatsapp'])

export const stores = pgTable('stores', {
  id: id(),
  slug: text().notNull().unique(),
  name: text().notNull(),
  active: boolean().notNull().default(true),
  // Row-locked counter → human-friendly order numbers per store without races.
  orderSeq: integer().notNull().default(1000),
  createdAt: createdAt(),
})

export const storeDomains = pgTable(
  'store_domains',
  {
    id: id(),
    storeId: storeId(),
    host: text().notNull().unique(),
    primary: boolean().notNull().default(false),
  },
  (t) => [index('store_domains_store_id_idx').on(t.storeId)],
)

export const storeEntitlements = pgTable(
  'store_entitlements',
  { storeId: storeId(), entitlement: text().notNull(), createdAt: createdAt() },
  (t) => [primaryKey({ columns: [t.storeId, t.entitlement] })],
)

// Per-store module switches (J5); a missing row means "use the catalogue default".
// Activity log (F3): who changed what, from where; settings entries can be undone.
export const activityLog = pgTable(
  'activity_log',
  {
    id: id(),
    storeId: storeId(),
    action: text().notNull(),
    actorId: text(),
    actorIp: text().notNull(),
    before: jsonb(),
    after: jsonb(),
    undoneAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('activity_store_created_idx').on(t.storeId, t.createdAt)],
)

// Admin notifications (F2): new orders today; more kinds later.
export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    storeId: storeId(),
    kind: text().$type<'order'>().notNull(),
    ref: text().notNull(),
    data: jsonb().$type<{ orderNo: number }>().notNull(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_store_created_idx').on(t.storeId, t.createdAt)],
)

// CMS pages (J8): body is plain text with light markup, rendered as text (never HTML).
export const pages = pgTable(
  'pages',
  {
    id: id(),
    storeId: storeId(),
    slug: text().notNull(),
    title: text().notNull(),
    body: text().notNull(),
    published: boolean().notNull(),
    inFooter: boolean().notNull(),
    sortOrder: integer().notNull().default(0),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('pages_store_slug_uq').on(t.storeId, t.slug)],
)

export const storeFeatures = pgTable(
  'store_features',
  {
    storeId: storeId(),
    feature: text().notNull(),
    enabled: boolean().notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.feature] })],
)

// Better Auth core tables (plural names) + role/store for authorization.
export const users = pgTable(
  'users',
  {
    id: text().primaryKey(),
    name: text().notNull(),
    email: text().notNull().unique(),
    emailVerified: boolean().notNull().default(false),
    image: text(),
    role: roleEnum().notNull().default('STAFF'),
    storeId: uuid().references(() => stores.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('users_store_id_idx').on(t.storeId)],
)

export const sessions = pgTable(
  'sessions',
  {
    id: text().primaryKey(),
    token: text().notNull().unique(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    ipAddress: text(),
    userAgent: text(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
)

export const accounts = pgTable(
  'accounts',
  {
    id: text().primaryKey(),
    accountId: text().notNull(),
    providerId: text().notNull(),
    userId: text()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text(),
    refreshToken: text(),
    idToken: text(),
    accessTokenExpiresAt: timestamp({ withTimezone: true }),
    refreshTokenExpiresAt: timestamp({ withTimezone: true }),
    scope: text(),
    password: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('accounts_user_id_idx').on(t.userId)],
)

export const verifications = pgTable('verifications', {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
})

export const siteSettings = pgTable('site_settings', {
  storeId: uuid()
    .primaryKey()
    .references(() => stores.id, { onDelete: 'cascade' }),
  design: jsonb().notNull(),
  business: jsonb().notNull(),
  layout: jsonb(),
  version: integer().notNull().default(1),
  updatedAt: updatedAt(),
})

export const media = pgTable(
  'media',
  {
    id: id(),
    storeId: storeId(),
    kind: text().notNull(),
    ref: text().notNull(),
    width: integer(),
    height: integer(),
    bytes: integer().notNull().default(0),
    blurhash: text(),
    dominantColor: text(),
    focalX: integer().notNull().default(50),
    focalY: integer().notNull().default(50),
    alt: text(),
    orphanedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index('media_store_id_idx').on(t.storeId),
    index('media_orphaned_at_idx').on(t.orphanedAt),
  ],
)

export const sizeCharts = pgTable('size_charts', {
  id: id(),
  storeId: storeId(),
  name: text().notNull(),
  // A5: the first row is the header.
  rows: jsonb().$type<string[][]>().notNull(),
  createdAt: createdAt(),
})

export const categories = pgTable(
  'categories',
  {
    id: id(),
    storeId: storeId(),
    parentId: uuid().references((): AnyPgColumn => categories.id, { onDelete: 'restrict' }),
    sizeChartId: uuid().references(() => sizeCharts.id, { onDelete: 'set null' }),
    name: text().notNull(),
    slug: text().notNull(),
    sortOrder: integer().notNull().default(0),
    archived: boolean().notNull().default(false),
    seoTitle: text(),
    seoDescription: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('categories_store_slug_uq').on(t.storeId, t.slug),
    index('categories_store_parent_sort_idx').on(t.storeId, t.parentId, t.sortOrder),
  ],
)

export const brands = pgTable(
  'brands',
  {
    id: id(),
    storeId: storeId(),
    name: text().notNull(),
    slug: text().notNull(),
    logoId: uuid().references(() => media.id, { onDelete: 'set null' }),
    archived: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('brands_store_slug_uq').on(t.storeId, t.slug)],
)

export const products = pgTable(
  'products',
  {
    id: id(),
    storeId: storeId(),
    categoryId: uuid().references(() => categories.id, { onDelete: 'set null' }),
    brandId: uuid().references(() => brands.id, { onDelete: 'set null' }),
    sizeChartId: uuid().references(() => sizeCharts.id, { onDelete: 'set null' }),
    // A8 owner picks (ids may go stale; the storefront only shows live products).
    relatedIds: jsonb().$type<string[]>().notNull().default([]),
    fbtIds: jsonb().$type<string[]>().notNull().default([]),
    name: text().notNull(),
    slug: text().notNull(),
    description: text().notNull().default(''),
    price: integer().notNull(),
    compareAtPrice: integer(),
    costPrice: integer().notNull().default(0),
    stock: integer().notNull().default(0),
    lowStockThreshold: integer().notNull().default(5),
    minQty: integer(),
    maxQty: integer(),
    sku: text(),
    status: productStatusEnum().notNull().default('draft'),
    // J3: a sample from a demo pack; parkedStatus is the status "hide mine" saved.
    demo: boolean().notNull().default(false),
    parkedStatus: productStatusEnum(),
    sortOrder: integer().notNull().default(0),
    videoUrl: text(),
    seoTitle: text(),
    seoDescription: text(),
    // A3: owner's badge { text, tone } — validated by the catalog schema.
    badge: jsonb().$type<{ text: string; tone: 'accent' | 'success' | 'danger' | 'neutral' }>(),
    // A6 content tabs (specs, how-to, FAQ, benefits, why buy) — validated by the catalog schema.
    content: jsonb()
      .$type<ProductContent>()
      .notNull()
      .default({ specs: [], howTo: [], faq: [], benefits: [], whyBuy: [] }),
    // A1 options (size, colour…); with options, stock is the sum of the variants' stock.
    options: jsonb().$type<ProductOptions>().notNull().default([]),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('products_store_slug_uq').on(t.storeId, t.slug),
    index('products_store_status_sort_idx').on(t.storeId, t.status, t.sortOrder),
    index('products_store_category_idx').on(t.storeId, t.categoryId),
  ],
)

export const productMedia = pgTable(
  'product_media',
  {
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    mediaId: uuid()
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.mediaId] })],
)

export const customers = pgTable(
  'customers',
  {
    id: id(),
    storeId: storeId(),
    phone: text().notNull(),
    name: text().notNull(),
    email: text(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('customers_store_phone_uq').on(t.storeId, t.phone)],
)

export const orders = pgTable(
  'orders',
  {
    id: id(),
    storeId: storeId(),
    orderNo: integer().notNull(),
    customerId: uuid()
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    status: orderStatusEnum().notNull().default('PENDING'),
    // C13: when a SCHEDULED order falls due; trashed orders are hidden, not deleted.
    scheduledFor: timestamp({ withTimezone: true }),
    deletedAt: timestamp({ withTimezone: true }),
    subtotal: integer().notNull(),
    deliveryCharge: integer().notNull(),
    // C2: what the coupon took off (goods or delivery), and its code.
    discount: integer().notNull().default(0),
    couponCode: text(),
    total: integer().notNull(),
    deliveryZone: text().notNull(),
    shipName: text().notNull(),
    shipPhone: text().notNull(),
    shipAddress: text().notNull(),
    shipArea: text().notNull(),
    shipDistrict: text().notNull(),
    // C6 extra checkout fields.
    shipAltPhone: text(),
    preferredTime: text().notNull().default('any'),
    giftWrap: boolean().notNull().default(false),
    // C5: shared from the shopper's device on tap (accuracy in metres).
    shipLocation: jsonb().$type<{ lat: number; lng: number; accuracy: number }>(),
    note: text(),
    paymentMethod: text().notNull().default('COD'),
    // C15: web, landing, chat, voice, pos, manual, import.
    source: text().$type<OrderSource>().notNull().default('web'),
    // H5: the landing page the order was placed on (its orders and conversion).
    landingId: uuid(),
    // D3/D4: who placed a web order (IP and the first-party device cookie).
    clientIp: text(),
    deviceId: text(),
    paymentStatus: paymentStatusEnum().notNull().default('unpaid'),
    stockDeducted: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('orders_store_order_no_uq').on(t.storeId, t.orderNo),
    index('orders_store_status_created_idx').on(t.storeId, t.status, t.createdAt),
    index('orders_store_phone_idx').on(t.storeId, t.shipPhone),
  ],
)

// A1: one row per option combination of a product.
export const productVariants = pgTable(
  'product_variants',
  {
    id: id(),
    storeId: storeId(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    options: jsonb().$type<VariantOptions>().notNull(),
    price: integer().notNull(),
    compareAtPrice: integer(),
    costPrice: integer().notNull().default(0),
    stock: integer().notNull().default(0),
    sku: text(),
    sortOrder: integer().notNull().default(0),
  },
  (t) => [index('product_variants_product_idx').on(t.productId, t.sortOrder)],
)

// C2: owner-made discount codes; `used` is bumped atomically when an order redeems one.
export const coupons = pgTable(
  'coupons',
  {
    id: id(),
    storeId: storeId(),
    code: text().notNull(),
    kind: text().$type<'percent' | 'fixed' | 'free_shipping'>().notNull(),
    value: integer().notNull(),
    minSubtotal: integer().notNull().default(0),
    productIds: jsonb().$type<string[]>().notNull().default([]),
    categoryIds: jsonb().$type<string[]>().notNull().default([]),
    startsAt: timestamp({ withTimezone: true }),
    endsAt: timestamp({ withTimezone: true }),
    totalLimit: integer(),
    perPhoneLimit: integer(),
    autoApply: boolean().notNull().default(false),
    active: boolean().notNull().default(true),
    used: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('coupons_store_code_uq').on(t.storeId, t.code)],
)

export const couponRedemptions = pgTable(
  'coupon_redemptions',
  {
    id: id(),
    storeId: storeId(),
    couponId: uuid()
      .notNull()
      .references(() => coupons.id, { onDelete: 'cascade' }),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    phone: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('coupon_redemptions_coupon_phone_idx').on(t.couponId, t.phone)],
)

/** D3: phones, IPs and devices that may not order. */
export const blocks = pgTable(
  'blocks',
  {
    id: id(),
    storeId: storeId(),
    kind: text().$type<'phone' | 'ip' | 'device'>().notNull(),
    value: text().notNull(),
    note: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('blocks_store_kind_value_uq').on(t.storeId, t.kind, t.value)],
)

/** D5: refused order attempts (blocked, too many, duplicate). */
export const fraudAttempts = pgTable(
  'fraud_attempts',
  {
    id: id(),
    storeId: storeId(),
    reason: text().$type<'blocked' | 'too_many' | 'duplicate'>().notNull(),
    phone: text().notNull(),
    ip: text().notNull(),
    deviceId: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('fraud_attempts_store_idx').on(t.storeId, t.createdAt)],
)

/** C14: a return or exchange recorded against a delivered order. */
export const orderReturns = pgTable(
  'order_returns',
  {
    id: id(),
    storeId: storeId(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    kind: text().$type<'return' | 'exchange'>().notNull(),
    reason: text().notNull(),
    note: text().notNull(),
    items: jsonb().$type<{ itemId: string; quantity: number }[]>().notNull(),
    refund: integer().notNull(),
    refundMethod: text().notNull(),
    restocked: boolean().notNull(),
    exchangeOrderId: uuid().references(() => orders.id, { onDelete: 'set null' }),
    actorId: uuid(),
    createdAt: createdAt(),
  },
  (t) => [index('order_returns_order_idx').on(t.orderId)],
)

/** C1: one per store + phone; replaced on every save, deleted when that phone orders. */
export const checkoutDrafts = pgTable(
  'checkout_drafts',
  {
    id: id(),
    storeId: storeId(),
    phone: text().notNull(),
    name: text().notNull(),
    email: text().notNull(),
    district: text().notNull(),
    area: text().notNull(),
    address: text().notNull(),
    note: text().notNull(),
    zoneId: text().notNull(),
    items: jsonb()
      .$type<{ productId: string; variantId: string | null; quantity: number }[]>()
      .notNull(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('checkout_drafts_store_phone_uq').on(t.storeId, t.phone)],
)

export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid().references(() => products.id, { onDelete: 'set null' }),
    variantId: uuid().references(() => productVariants.id, { onDelete: 'set null' }),
    name: text().notNull(),
    // "M / Red" at the time of the order — the variant may change or go later.
    variantLabel: text(),
    unitPrice: integer().notNull(),
    unitCost: integer().notNull(),
    quantity: integer().notNull(),
  },
  (t) => [index('order_items_order_id_idx').on(t.orderId)],
)

// A7: one review per delivered order and product; shown once approved.
export const reviews = pgTable(
  'reviews',
  {
    id: id(),
    storeId: storeId(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    rating: integer().notNull(),
    body: text().notNull(),
    status: reviewStatusEnum().notNull().default('pending'),
    reply: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('reviews_order_product_uq').on(t.orderId, t.productId),
    index('reviews_store_product_idx').on(t.storeId, t.productId, t.status),
  ],
)

// A7: chat screenshots the owner shows as "What customers say".
export const reviewScreenshots = pgTable('review_screenshots', {
  id: id(),
  storeId: storeId(),
  mediaId: uuid()
    .notNull()
    .references(() => media.id, { onDelete: 'cascade' }),
  caption: text().notNull().default(''),
  createdAt: createdAt(),
})

export const orderEvents = pgTable(
  'order_events',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    fromStatus: orderStatusEnum(),
    toStatus: orderStatusEnum().notNull(),
    actorId: text(),
    note: text(),
    createdAt: createdAt(),
  },
  (t) => [index('order_events_order_id_idx').on(t.orderId)],
)

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: id(),
    storeId: storeId(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid().references(() => productVariants.id, { onDelete: 'set null' }),
    delta: integer().notNull(),
    reason: stockReasonEnum().notNull(),
    note: text(),
    orderId: uuid().references(() => orders.id, { onDelete: 'set null' }),
    actorId: text(),
    createdAt: createdAt(),
  },
  (t) => [index('stock_movements_store_product_idx').on(t.storeId, t.productId, t.createdAt)],
)

export const banners = pgTable(
  'banners',
  {
    id: id(),
    storeId: storeId(),
    kind: text().notNull(),
    data: jsonb().notNull(),
    active: boolean().notNull().default(true),
    sortOrder: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('banners_store_sort_idx').on(t.storeId, t.sortOrder)],
)

export const messageTemplates = pgTable(
  'message_templates',
  {
    storeId: storeId(),
    event: text().notNull(),
    channel: channelEnum().notNull(),
    locale: text().notNull(),
    body: text().notNull(),
    enabled: boolean().notNull().default(true),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.event, t.channel, t.locale] })],
)

export const messageOutbox = pgTable(
  'message_outbox',
  {
    id: id(),
    storeId: storeId(),
    channel: channelEnum().notNull(),
    recipient: text().notNull(),
    body: text().notNull(),
    dedupeKey: text().notNull(),
    status: outboxStatusEnum().notNull().default('pending'),
    attempts: integer().notNull().default(0),
    nextAttemptAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    lastError: text(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('message_outbox_dedupe_uq').on(t.storeId, t.dedupeKey),
    index('message_outbox_due_idx').on(t.status, t.nextAttemptAt),
  ],
)

export const otpCodes = pgTable(
  'otp_codes',
  {
    id: id(),
    storeId: storeId(),
    target: text().notNull(),
    codeHash: text().notNull(),
    attempts: integer().notNull().default(0),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    consumedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('otp_codes_store_target_idx').on(t.storeId, t.target, t.createdAt)],
)

export const pageViews = pgTable(
  'page_views',
  {
    id: id(),
    storeId: storeId(),
    visitorHash: text().notNull(),
    path: text().notNull(),
    createdAt: createdAt(),
  },
  (t) => [index('page_views_store_created_idx').on(t.storeId, t.createdAt)],
)

export const dailyStats = pgTable(
  'daily_stats',
  {
    storeId: storeId(),
    date: date().notNull(),
    visitors: integer().notNull().default(0),
    pageViews: integer().notNull().default(0),
    ordersPlaced: integer().notNull().default(0),
    ordersConfirmed: integer().notNull().default(0),
    ordersDelivered: integer().notNull().default(0),
    ordersCancelled: integer().notNull().default(0),
    ordersReturned: integer().notNull().default(0),
    revenue: bigint({ mode: 'number' }).notNull().default(0),
    cost: bigint({ mode: 'number' }).notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.storeId, t.date] })],
)

/** E1: a shop's merchant account with a courier; keys are sealed (AES-GCM) with SETTINGS_KEY. */
export const courierAccounts = pgTable(
  'courier_accounts',
  {
    id: id(),
    storeId: storeId(),
    provider: text().$type<CourierProvider>().notNull(),
    label: text().notNull(),
    credentials: text().notNull(),
    // E2: the courier calls /api/courier/hook/<token>; the token is the webhook's secret.
    webhookToken: text().notNull().unique(),
    isDefault: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('courier_accounts_store_idx').on(t.storeId)],
)

/** E1/E2: one parcel per order, with the courier's reference and latest status. */
export const courierShipments = pgTable(
  'courier_shipments',
  {
    id: id(),
    storeId: storeId(),
    orderId: uuid()
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: 'cascade' }),
    accountId: uuid().references(() => courierAccounts.id, { onDelete: 'set null' }),
    provider: text().$type<CourierProvider>().notNull(),
    ref: text().notNull(),
    tracking: text().notNull(),
    cod: bigint({ mode: 'number' }).notNull(),
    charge: bigint({ mode: 'number' }),
    rawStatus: text().notNull(),
    state: text().$type<ParcelState>().notNull(),
    // E5: the courier's collected cash (owner-entered) and when it was paid to the shop.
    codCollected: bigint({ mode: 'number' }),
    paidOutAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('courier_shipments_account_ref_idx').on(t.accountId, t.ref),
    index('courier_shipments_state_updated_idx').on(t.state, t.updatedAt),
  ],
)

/** E2: every status a courier reported, raw payload kept for support questions. */
export const courierEvents = pgTable(
  'courier_events',
  {
    id: id(),
    storeId: storeId(),
    shipmentId: uuid()
      .notNull()
      .references(() => courierShipments.id, { onDelete: 'cascade' }),
    rawStatus: text().notNull(),
    state: text().$type<ParcelState>().notNull(),
    payload: jsonb().$type<unknown>(),
    createdAt: createdAt(),
  },
  (t) => [index('courier_events_shipment_idx').on(t.shipmentId)],
)

/** E4: a hand-over to a courier's rider, or a session receiving returned parcels. */
export const parcelHandovers = pgTable(
  'parcel_handovers',
  {
    id: id(),
    storeId: storeId(),
    kind: text().$type<SessionKind>().notNull(),
    provider: text().$type<CourierProvider>().notNull(),
    riderName: text().notNull().default(''),
    riderPhone: text().notNull().default(''),
    createdAt: createdAt(),
  },
  (t) => [index('parcel_handovers_store_idx').on(t.storeId, t.createdAt)],
)

/** E4: each parcel scanned in a session, once. */
export const parcelHandoverItems = pgTable(
  'parcel_handover_items',
  {
    id: id(),
    storeId: storeId(),
    handoverId: uuid()
      .notNull()
      .references(() => parcelHandovers.id, { onDelete: 'cascade' }),
    shipmentId: uuid()
      .notNull()
      .references(() => courierShipments.id, { onDelete: 'cascade' }),
    scannedAt: createdAt(),
  },
  (t) => [uniqueIndex('parcel_handover_items_uq').on(t.handoverId, t.shipmentId)],
)

/** H5: product landing pages — blocks in order, each shown or hidden. */
export const landingPages = pgTable(
  'landing_pages',
  {
    id: id(),
    storeId: storeId(),
    slug: text().notNull(),
    title: text().notNull(),
    productId: uuid()
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    design: text().$type<LandingDesign>().notNull(),
    siteChrome: boolean().notNull().default(false),
    hidden: boolean().notNull().default(false),
    blocks: jsonb().$type<LandingBlock[]>().notNull(),
    visits: integer().notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('landing_pages_store_slug_uq').on(t.storeId, t.slug)],
)

/** B4: reels — an uploaded video or a link, a cover, a caption and the products it shows. */
export const reels = pgTable('reels', {
  id: id(),
  storeId: storeId(),
  videoId: uuid(),
  url: text(),
  coverId: uuid(),
  caption: text().notNull().default(''),
  productIds: jsonb().$type<string[]>().notNull().default([]),
  sortOrder: integer().notNull().default(0),
  createdAt: createdAt(),
})

/** B13: newsletter / offer sign-ups (phone or email) with their consent time. */
export const subscribers = pgTable(
  'subscribers',
  {
    id: id(),
    storeId: storeId(),
    contact: text().notNull(),
    kind: text().$type<'phone' | 'email'>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('subscribers_store_contact_uq').on(t.storeId, t.contact)],
)
