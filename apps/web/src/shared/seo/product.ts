import type { ActivePrice, Product } from '@/entities/product/model';
import { formatDateIso } from '@/shared/lib/format';

import { PRICE_CURRENCY, absoluteUrl, compact, schemaEnum, text, type JsonLdNode } from './schema';
import { organizationId } from './organization';

/**
 * `Product` + `Offer` для карточки товара и `ItemList` для листинга
 * (docs/SEO.md §4).
 *
 * 🔴 В `Offer` уходит действующая цена — та самая, которую человек видит на
 * странице. Старая цена в разметке при скидке на витрине (или наоборот) —
 * основание для ручных санкций (инвариант 9, docs/SEO.md §4).
 */

/** Границы скидки владелец задаёт днями по местному времени — так их и отдаём. */
const SALE_TIME_ZONE = 'Europe/Moscow';

export type ProductJsonLdInput = {
  readonly siteUrl: string;
  /** Путь карточки: `/catalog/split-09`. */
  readonly path: string;
  readonly product: Product;
  /**
   * Действующая цена — результат `getActivePrice` для этого же товара.
   * Передаётся, а не считается здесь: цена в разметке обязана быть ровно той,
   * что страница отдала в карточку.
   */
  readonly price: ActivePrice;
};

function buildOffer(input: ProductJsonLdInput): JsonLdNode {
  const { price, product } = input;
  const url = absoluteUrl(input.siteUrl, input.path);

  return compact({
    '@type': 'Offer',
    url,
    price: price.currentPrice,
    priceCurrency: PRICE_CURRENCY,
    // скидка закончилась — `priceValidUntil` уходит вместе с ней, иначе
    // поисковик считает предложение неактуальным и убирает цену из сниппета
    priceValidUntil:
      price.saleTo === null ? undefined : formatDateIso(price.saleTo, SALE_TIME_ZONE),
    // невидимая модель страницы не имеет, поэтому наличие берётся из витрины,
    // а не из выдуманного «всегда в наличии»
    availability: schemaEnum(product.visible ? 'InStock' : 'OutOfStock'),
    itemCondition: schemaEnum('NewCondition'),
    seller: { '@id': organizationId(input.siteUrl) },
  });
}

export function buildProductJsonLd(input: ProductJsonLdInput): JsonLdNode | null {
  const { product } = input;
  const name = text(product.name);
  if (name === undefined) return null;

  const images = product.photos
    .map((photo) => text(photo.url))
    .filter((url): url is string => url !== undefined)
    .map((url) => absoluteUrl(input.siteUrl, url));

  // характеристики — те же пары, что рисует таблица сравнения (инвариант 6)
  const specs = product.specs.flatMap((spec) => {
    const specName = text(spec.k);
    const specValue = text(spec.v);
    if (specName === undefined || specValue === undefined) return [];
    return [{ '@type': 'PropertyValue', name: specName, value: specValue }];
  });

  const brand = text(product.brand);

  return compact({
    '@type': 'Product',
    '@id': `${absoluteUrl(input.siteUrl, input.path)}#product`,
    name,
    description: text(product.seoDescription),
    sku: text(product.sku),
    brand: brand === undefined ? undefined : { '@type': 'Brand', name: brand },
    image: images,
    url: absoluteUrl(input.siteUrl, input.path),
    additionalProperty: specs,
    offers: buildOffer(input),
  });
}

export type ItemListEntry = {
  readonly name: string;
  readonly path: string;
};

export type ItemListInput = {
  readonly siteUrl: string;
  readonly items: readonly ItemListEntry[];
  readonly name?: string | undefined;
};

/** `ItemList` из карточек листинга: порядок в разметке — порядок на витрине. */
export function buildItemListJsonLd(input: ItemListInput): JsonLdNode | null {
  const items = input.items
    .map((item) => ({ name: text(item.name), path: text(item.path) }))
    .filter((item): item is { name: string; path: string } => {
      return item.name !== undefined && item.path !== undefined;
    });

  if (items.length === 0) return null;

  return compact({
    '@type': 'ItemList',
    name: text(input.name),
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(input.siteUrl, item.path),
    })),
  });
}
