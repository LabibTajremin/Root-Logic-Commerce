export { createCatalog, type Catalog } from './application/catalog'
export type {
  Brand,
  CatalogRepo,
  Category,
  CategoryData,
  Product,
  ProductFilter,
  SortOrder,
} from './application/ports'
export { slugify } from './domain/slug'
export { cardBadges, stockLeft, type CardBadge } from './domain/merchandising'
export { badgeTones, type BadgeTone, type BrandInput } from './domain/rules'
export { contentFromText, contentToText, type ProductContent } from './domain/content'
