import { defineStoreConfig } from '@/server/config'

// First-deploy defaults only. Env overrides these; the admin panel (DB) overrides both.
export default defineStoreConfig({
  store: { name: 'My Store', slug: 'my-store', theme: 'minimal', locale: 'en', currency: 'BDT' },
  toggles: { otpEmail: false, otpSms: false },
  channels: { email: false, sms: false, whatsapp: false },
  storage: { driver: 'local' },
  entitlements: [],
  rootLogicLab: { whatsapp: '+8801700000000' },
})
