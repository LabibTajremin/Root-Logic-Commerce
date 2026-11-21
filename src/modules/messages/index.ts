export { createOtp, type Otp } from './application/otp'
export type { OtpRepo, OtpRow, Send } from './application/ports'
export { maskTarget, otpTarget, type OtpChannel, type OtpSettings } from './domain/otp'
export { createMessaging, type Messaging } from './application/messaging'
export type {
  Deliver,
  OrderFacts,
  OutboxChannel,
  OutboxRepo,
  OutboxRow,
  SavedTemplateRow,
  StoreFacts,
} from './application/ports'
export {
  defaultTemplates,
  messageEvents,
  render,
  templateFor,
  type Channel,
  type MessageEvent,
} from './domain/templates'
