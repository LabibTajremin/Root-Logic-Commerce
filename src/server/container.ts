import { createHash, createHmac, randomBytes, randomInt, randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { createAccess } from '@/modules/access'
import { createCatalog } from '@/modules/catalog'
import { createLanding } from '@/modules/landing'
import { createReels } from '@/modules/promotions'
import { createInsights } from '@/modules/insights'
import { createPromotions } from '@/modules/promotions'
import { createMedia } from '@/modules/media'
import { createMessaging, createOtp } from '@/modules/messages'
import { createFraud } from '@/modules/fraud'
import { createCourier } from '@/modules/courier'
import { createTracking } from '@/modules/tracking'
import { createTrackingSender } from '@/infrastructure/tracking/sender'
import { createCourierApis } from '@/infrastructure/courier/couriers'
import { createCourierRepo } from '@/infrastructure/db/repositories/courier-repo'
import { createDrafts, createOrders, type OrderEvents } from '@/modules/orders'
import { createNotifications } from '@/modules/notifications'
import { createActivity } from '@/modules/activity'
import { auditActor } from './audit-context'
import { createCoupons } from '@/modules/coupons'
import { createPages } from '@/modules/pages'
import { createReviews, lookupFromTracking } from '@/modules/reviews'
import { createFeatures, createPlans } from '@/modules/plans'
import { createEventBus, createRateLimiter, formatMoney } from '@/modules/shared'
import { createSiteSettings } from '@/modules/site-settings'
import { createStock } from '@/modules/stock'
import type { Db } from '@/infrastructure/db/client'
import { createCatalogRepo } from '@/infrastructure/db/repositories/catalog-repo'
import { createLandingRepo } from '@/infrastructure/db/repositories/landing-repo'
import { createReelsRepo } from '@/infrastructure/db/repositories/reels-repo'
import { createBannersRepo } from '@/infrastructure/db/repositories/banners-repo'
import { createInsightsRepo } from '@/infrastructure/db/repositories/insights-repo'
import { createMediaRepo } from '@/infrastructure/db/repositories/media-repo'
import { createDrive } from '@/infrastructure/media/drive'
import { sharpImages } from '@/infrastructure/media/sharp-images'
import { createLocalStorage } from '@/infrastructure/storage/local-storage'
import { createS3Storage } from '@/infrastructure/storage/s3-storage'
import { unavailableStorage } from '@/infrastructure/storage/unavailable'
import { createOtpRepo } from '@/infrastructure/db/repositories/otp-repo'
import { createEntitlementsRepo } from '@/infrastructure/db/repositories/entitlements-repo'
import { createFeaturesRepo } from '@/infrastructure/db/repositories/features-repo'
import { createCouponsRepo } from '@/infrastructure/db/repositories/coupons-repo'
import { createPagesRepo } from '@/infrastructure/db/repositories/pages-repo'
import { createReviewsRepo } from '@/infrastructure/db/repositories/reviews-repo'
import { createActivityRepo } from '@/infrastructure/db/repositories/activity-repo'
import { createNotificationsRepo } from '@/infrastructure/db/repositories/notifications-repo'
import { createOrdersRepo } from '@/infrastructure/db/repositories/orders-repo'
import { createDraftsRepo } from '@/infrastructure/db/repositories/drafts-repo'
import { createFraudRepo } from '@/infrastructure/db/repositories/fraud-repo'
import { createSettingsRepo } from '@/infrastructure/db/repositories/settings-repo'
import { createStockRepo } from '@/infrastructure/db/repositories/stock-repo'
import { createStoreDirectory } from '@/infrastructure/db/repositories/store-directory'
import { createUsersRepo } from '@/infrastructure/db/repositories/users-repo'
import { createSecretBox } from '@/infrastructure/crypto/secret-box'
import { createOutboxRepo } from '@/infrastructure/db/repositories/outbox-repo'
import { createDeliver } from '@/infrastructure/notify/channels'
import type { AppConfig } from './config'

type Deps = {
  config: Pick<
    AppConfig,
    | 'entitlements'
    | 'storage'
    | 'mediaDir'
    | 's3'
    | 'store'
    | 'settingsKey'
    | 'messagesTransport'
    | 'courierTransport'
    | 'trackingTransport'
    | 'authSecret'
  > & { notifyLogFile?: string }
  db: Db
  onEventError: (error: unknown, type: string) => void
}

// Composition root: the only place that knows which adapter backs which port.
export const createContainer = ({ config, db, onEventError }: Deps) => {
  const bus = createEventBus<OrderEvents>((e, t) => onEventError(e, String(t)))
  const activity = createActivity({
    repo: createActivityRepo(db),
    now: () => new Date(),
    retentionDays: 30,
  })
  // F3: every audited change is logged against the actor of the current admin action.
  const audit = async (storeId: string, action: string, before: unknown, after: unknown) => {
    const { actorId, ip } = auditActor()
    await activity.record(storeId, { action, before, after, actorId, actorIp: ip })
  }
  const settings = createSiteSettings({ repo: createSettingsRepo(db), audit })
  const coupons = createCoupons({ repo: createCouponsRepo(db) })
  const fraud = createFraud({ repo: createFraudRepo(db) })
  const orders = createOrders({ repo: createOrdersRepo(db), bus, coupons, fraud })
  const secrets = createSecretBox(config.settingsKey)
  const plans = createPlans({ repo: createEntitlementsRepo(db), configured: config.entitlements })
  const storeSettings = (storeId: string) => settings.get(storeId, { storeName: config.store.name })
  const deliver = createDeliver({
    mode: config.messagesTransport,
    logFile: config.notifyLogFile,
    settings: async (id) => {
      const s = await storeSettings(id)
      return { business: s.business, storeName: s.design.brand.name }
    },
    box: secrets,
  })
  const messaging = createMessaging({
    repo: createOutboxRepo(db),
    order: async (storeId, id) => {
      const o = await orders.getOrder(storeId, id)
      return (
        o && {
          orderNo: o.orderNo,
          total: formatMoney(o.total),
          name: o.shipName,
          phone: o.shipPhone,
          email: o.customerEmail,
        }
      )
    },
    store: async (id) => {
      const { business: b, design } = await storeSettings(id)
      const m = b.messages
      return {
        name: design.brand.name,
        locale: config.store.locale,
        channels: { email: m.email.enabled, sms: m.sms.enabled, whatsapp: m.whatsapp.enabled },
        ownerPhone: m.ownerPhone,
        ownerEmail: m.ownerEmail,
      }
    },
    deliver,
    now: () => new Date(),
  })
  for (const s of ['placed', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const)
    bus.on(`order.${s}`, (e) => messaging.onOrderEvent(`order.${s}`, e))
  const notifications = createNotifications({ repo: createNotificationsRepo(db) })
  bus.on('order.placed', (e) => notifications.onOrderPlaced(e))
  // C21: a scheduled order falling due shows in the bell like a new one.
  bus.on('order.pending', (e) => notifications.onOrderPlaced(e))
  const insights = createInsights({
    repo: createInsightsRepo(db),
    hash: (s) => createHmac('sha256', config.authSecret).update(s).digest('hex'),
    money: async (storeId, id) => {
      const o = await orders.getOrder(storeId, id)
      return (
        o && {
          revenue: o.subtotal,
          cost: o.items.reduce((sum, i) => sum + i.unitCost * i.quantity, 0),
        }
      )
    },
    now: () => new Date(),
  })
  for (const s of ['placed', 'confirmed', 'delivered', 'cancelled', 'returned'] as const)
    bus.on(`order.${s}`, (e) => insights.onOrderEvent(s, e))
  const tracking = createTracking({
    settings: async (id) => {
      const { business } = await storeSettings(id)
      return { tracking: business.tracking, currency: business.currency }
    },
    order: async (storeId, id) => {
      const o = await orders.getOrder(storeId, id)
      return (
        o && {
          orderNo: o.orderNo,
          total: o.total,
          phone: o.shipPhone,
          email: o.customerEmail,
          items: o.items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          })),
        }
      )
    },
    open: (s) => secrets.open(s),
    sha256: (s) => createHash('sha256').update(s).digest('hex'),
    send: createTrackingSender({
      mode: config.trackingTransport,
      logFile: config.notifyLogFile,
    }),
    now: () => new Date(),
  })
  for (const s of ['placed', 'confirmed', 'delivered'] as const)
    bus.on(`order.${s}`, (e) => tracking.onOrderEvent(s, e))
  const courier = createCourier({
    repo: createCourierRepo(db),
    api: createCourierApis({ mode: config.courierTransport }),
    box: secrets,
    orders,
    token: () => randomBytes(24).toString('base64url'),
    now: () => new Date(),
  })
  return {
    bus,
    courier,
    messaging,
    insights,
    promotions: createPromotions({ repo: createBannersRepo(db) }),
    reels: createReels({ repo: createReelsRepo(db) }),
    // Per store + client IP, per process (spec §8: rate-limit checkout and tracking).
    limits: {
      checkout: createRateLimiter({ limit: 10, windowMs: 10 * 60_000 }),
      track: createRateLimiter({ limit: 20, windowMs: 10 * 60_000 }),
    },
    secrets,
    stores: createStoreDirectory(db),
    catalog: createCatalog({
      repo: createCatalogRepo(db),
      shortId: () => randomBytes(3).toString('hex'),
      audit,
    }),
    orders,
    fraud,
    drafts: createDrafts({
      repo: createDraftsRepo(db),
      allow: createRateLimiter({ limit: 60, windowMs: 10 * 60_000 }).allow,
    }),
    coupons,
    stock: createStock({ repo: createStockRepo(db) }),
    plans,
    features: createFeatures({ repo: createFeaturesRepo(db), plans }),
    pages: createPages({ repo: createPagesRepo(db) }),
    landing: createLanding({
      repo: createLandingRepo(db),
      product: (storeId, id) => createCatalogRepo(db).getProduct(storeId, id),
    }),
    reviews: createReviews({
      repo: createReviewsRepo(db),
      // A7: the shopper proves the order with its number + phone, as on tracking.
      lookup: lookupFromTracking(orders.trackOrder),
    }),
    notifications,
    activity,
    settings,
    access: createAccess({ repo: createUsersRepo(db), hash: hashPassword }),
    media: createMedia({
      repo: createMediaRepo(db),
      storage: {
        local: () => createLocalStorage(config.mediaDir, config.storage.minFreeDiskBytes),
        s3: () => createS3Storage(config.s3),
        gdrive: () => unavailableStorage('gdrive'),
      }[config.storage.driver](),
      images: sharpImages,
      drive: createDrive(),
      quotaBytes: config.storage.quotaBytes,
      videoMaxBytes: config.storage.videoMaxBytes,
      newId: randomUUID,
    }),
    otp: createOtp({
      repo: createOtpRepo(db),
      send: deliver,
      hash: (s) => createHash('sha256').update(s).digest('hex'),
      code: () => String(randomInt(0, 1_000_000)).padStart(6, '0'),
      now: () => new Date(),
    }),
  }
}

export type Container = ReturnType<typeof createContainer>
