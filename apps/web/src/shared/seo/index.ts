/**
 * Публичный API SEO-обвязки: сборщики разметки Schema.org, метаданные и
 * карта статических адресов (docs/SEO.md §3–§5).
 *
 * Все сборщики — чистые функции: данные внутрь, узел разметки наружу. Данные
 * читает страница, она же решает, какие узлы вывести. Нечего показать —
 * сборщик возвращает `null`, и разметки не появляется вовсе.
 */

export { JsonLd } from './JsonLd';
export type { JsonLdProps } from './JsonLd';

export {
  PRICE_CURRENCY,
  SCHEMA_CONTEXT,
  absoluteUrl,
  compact,
  schemaEnum,
  text as seoText,
} from './schema';
export type { JsonLdNode, JsonLdValue } from './schema';

export {
  buildOrganizationJsonLd,
  buildPostalAddress,
  buildSameAs,
  buildWebSiteJsonLd,
  organizationId,
  webSiteId,
} from './organization';
export type { OrganizationParts } from './organization';

export { buildLocalBusinessJsonLd, localBusinessId } from './business';
export type { LocalBusinessParts } from './business';

export { buildBreadcrumbListJsonLd } from './breadcrumbs';
export type { BreadcrumbItem, BreadcrumbListInput } from './breadcrumbs';

export { buildItemListJsonLd, buildProductJsonLd } from './product';
export type { ItemListEntry, ItemListInput, ProductJsonLdInput } from './product';

export { buildServiceJsonLd } from './service';
export type { ServiceJsonLdInput, ServiceOfferInput } from './service';

export { buildArticleJsonLd } from './article';
export type { ArticleJsonLdInput } from './article';

export { buildFaqPageJsonLd } from './faq';
export type { FaqQuestion } from './faq';

export { buildAggregateRatingJsonLd, buildReviewJsonLd, buildReviewsJsonLd } from './reviews';
export type { AggregateRatingOptions, ReviewForSchema } from './reviews';

export { buildPageMetadata, buildTitle } from './metadata';
export type { PageMetadataInput } from './metadata';

export {
  ARTICLES_PATH,
  CATALOG_PATH,
  HOME_ROUTE,
  PRIVACY_PATH,
  SITE_ROUTES,
  articlePath,
  productPath,
} from './routes';
export type { SiteRoute } from './routes';

export { NOT_FOUND_CONTENT, NOT_FOUND_ROUTES } from './notFound';
