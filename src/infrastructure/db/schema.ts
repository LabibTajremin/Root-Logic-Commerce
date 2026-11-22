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
])
export const paymentStatusEnum = pgEnum('payment_status', ['unpaid', 'paid', 'refunded'])
export const stockReasonEnum = pgEnum('stock_reason', [
  'order_confirmed',
  'order_restocked',
  'manual',
])
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

export const categories = pgTable(
  'categories',
  {
    id: id(),
    storeId: storeId(),
    parentId: uuid().references((): AnyPgColumn => categories.id, { onDelete: 'restrict' }),
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

export const products = pgTable(
  'products',
  {
    id: id(),
    storeId: storeId(),
    categoryId: uuid().references(() => categories.id, { onDelete: 'set null' }),
    name: text().notNull(),
    slug: text().notNull(),
    description: text().notNull().default(''),
    price: integer().notNull(),
    compareAtPrice: integer(),
    costPrice: integer().notNull().default(0),
    stock: integer().notNull().default(0),
    lowStockThreshold: integer().notNull().default(5),
    sku: text(),
    status: productStatusEnum().notNull().default('draft'),
    sortOrder: integer().notNull().default(0),
    videoUrl: text(),
    seoTitle: text(),
    seoDescription: text(),
    // A3: owner's badge { text, tone } — validated by the catalog schema.
    badge: jsonb().$type<{ text: string; tone: 'accent' | 'success' | 'danger' | 'neutral' }>(),
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
    subtotal: integer().notNull(),
    deliveryCharge: integer().notNull(),
    total: integer().notNull(),
    deliveryZone: text().notNull(),
    shipName: text().notNull(),
    shipPhone: text().notNull(),
    shipAddress: text().notNull(),
    shipArea: text().notNull(),
    shipDistrict: text().notNull(),
    note: text(),
    paymentMethod: text().notNull().default('COD'),
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

export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: uuid()
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid().references(() => products.id, { onDelete: 'set null' }),
    name: text().notNull(),
    unitPrice: integer().notNull(),
    unitCost: integer().notNull(),
    quantity: integer().notNull(),
  },
  (t) => [index('order_items_order_id_idx').on(t.orderId)],
)

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
