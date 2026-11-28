export { createPromotions, type Promotions } from './application/promotions'
export type { Banner, BannersRepo } from './application/ports'
export {
  bannerData,
  parseEmbed,
  type BannerData,
  type BannerKind,
  type Embed,
} from './domain/promotions'
export { createReels, type Reel, type Reels, type ReelsRepo } from './application/reels'
export { reelInput, type ReelData, type ReelInput } from './domain/reels'
export { popupKinds, popupSchema, type Popup } from './domain/popups'
