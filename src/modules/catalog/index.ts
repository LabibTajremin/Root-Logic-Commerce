export { createCatalog, type Catalog } from './application/catalog'
export type {
  CatalogRepo,
  Category,
  CategoryData,
  Product,
  ProductFilter,
  SortOrder,
} from './application/ports'
export { slugify } from './domain/slug'
export { cardBadges, stockLeft, type CardBadge } from './domain/merchandising'
export { badgeTones, type BadgeTone } from './domain/rules'
