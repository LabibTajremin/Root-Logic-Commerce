import { createHash, createHmac, randomBytes, randomInt, randomUUID } from 'node:crypto'
import { hashPassword } from 'better-auth/crypto'
import { createAccess } from '@/modules/access'
import { createCatalog } from '@/modules/catalog'
import { createInsights } from '@/modules/insights'
import { createPromotions } from '@/modules/promotions'
import { createMedia } from '@/modules/media'
import { createMessaging, createOtp } from '@/modules/messages'
import { createOrders, type OrderEvents } from '@/modules/orders'
import { createPages } from '@/modules/pages'
import { createFeatures, createPlans } from '@/modules/plans'
import { createEventBus, createRateLimiter, formatMoney } from '@/modules/shared'
import { createSiteSettings } from '@/modules/site-settings'
import { createStock } from '@/modules/stock'
import type { Db } from '@/infrastructure/db/client'
import { createCatalogRepo } from '@/infrastructure/db/repositories/catalog-repo'
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
import { createPagesRepo } from '@/infrastructure/db/repositories/pages-repo'
import { createOrdersRepo } from '@/infrastructure/db/repositories/orders-repo'
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
    | 'authSecret'
  > & { notifyLogFile?: string }
  db: Db
  onEventError: (error: unknown, type: string) => void
}

// Composition root: the only place that knows which adapter backs which port.
export const createContainer = ({ config, db, onEventError }: Deps) => {
  const bus = createEventBus<OrderEvents>((e, t) => onEventError(e, String(t)))
  const settings = createSiteSettings({ repo: createSettingsRepo(db) })
  const orders = createOrders({ repo: createOrdersRepo(db), bus })
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
  return {
    bus,
    messaging,
    insights,
    promotions: createPromotions({ repo: createBannersRepo(db) }),
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
    }),
    orders,
    stock: createStock({ repo: createStockRepo(db) }),
    plans,
    features: createFeatures({ repo: createFeaturesRepo(db), plans }),
    pages: createPages({ repo: createPagesRepo(db) }),
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
