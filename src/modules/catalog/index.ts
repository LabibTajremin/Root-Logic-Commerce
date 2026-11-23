export { createCatalog, type Catalog } from './application/catalog'
export type {
  Brand,
  CatalogRepo,
  Category,
  CategoryData,
  Product,
  ProductFilter,
  SizeChart,
  ProductWrite,
  Variant,
  SortOrder,
} from './application/ports'
export { slugify } from './domain/slug'
export { cardBadges, stockLeft, type CardBadge } from './domain/merchandising'
export { badgeTones, type BadgeTone, type BrandInput } from './domain/rules'
export { contentFromText, contentToText, type ProductContent } from './domain/content'
export {
  mergeMatrix,
  optionsFromText,
  optionsToText,
  variantLabel,
  type ProductOptions,
  type VariantData,
  type VariantOptions,
} from './domain/variants'
export { chartFromText, chartToText, type SizeChartInput } from './domain/size-chart'
export {
  applyListing,
  gridCols,
  listingHref,
  listingSorts,
  parseListing,
  perPages,
  type Listing,
  type ListItem,
} from './domain/listing'
