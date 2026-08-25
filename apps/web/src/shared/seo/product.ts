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
  /**
   * Путь карточки: `/catalog/split-09`. Отдельных страниц у моделей нет
   * (ADR-049), поэтому путь необязателен: без него узел описывает товар
   * витрины и адреса не заявляет. Ссылка на несуществующую страницу в
   * разметке — обещание роботу, которое закончится 404.
   */
  readonly path?: string | undefined;
  readonly product: Product;
  /**
   * Действующая цена — результат `getActivePrice` для этого же товара.
   * Передаётся, а не считается здесь: цена в разметке обязана быть ровно той,
   * что страница отдала в карточку.
   */
  readonly price: ActivePrice;
};

/** Адрес карточки, если она есть. Нет пути — нет и адреса в разметке. */
function productUrl(input: ProductJsonLdInput): string | undefined {
  const path = text(input.path);
  return path === undefined ? undefined : absoluteUrl(input.siteUrl, path);
}

function buildOffer(input: ProductJsonLdInput): JsonLdNode {
  const { price, product } = input;

  return compact({
    '@type': 'Offer',
    url: productUrl(input),
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

  const url = productUrl(input);

  /* Идентификатор нужен и без своей страницы: по нему товар остаётся одним и
     тем же узлом между обходами. Слаг у модели уникален (PROJECT §3), поэтому
     он и различает узлы на общем адресе. */
  const id =
    url === undefined ? `${absoluteUrl(input.siteUrl)}#product-${product.slug}` : `${url}#product`;

  return compact({
    '@type': 'Product',
    '@id': id,
    name,
    description: text(product.seoDescription),
    sku: text(product.sku),
    brand: brand === undefined ? undefined : { '@type': 'Brand', name: brand },
    image: images,
    url,
    additionalProperty: specs,
    offers: buildOffer(input),
  });
}

export type CatalogListEntry = {
  readonly product: Product;
  /** Действующая цена этой модели — та же, что нарисована в карточке витрины. */
  readonly price: ActivePrice;
};

export type CatalogListInput = {
  readonly siteUrl: string;
  readonly items: readonly CatalogListEntry[];
  readonly name?: string | undefined;
};

/**
 * `ItemList` витрины: каждый пункт несёт вложенный `Product` с ценой.
 *
 * Так, а не ссылками на карточки: отдельных страниц у моделей нет (ADR-049),
 * и `url` в разметке вёл бы на 404. Товар при этом остаётся описанным —
 * Яндекс и Google читают предложение прямо из списка.
 */
export function buildCatalogItemListJsonLd(input: CatalogListInput): JsonLdNode | null {
  const products = input.items
    .map((item) => buildProductJsonLd({ siteUrl: input.siteUrl, ...item }))
    .filter((node): node is JsonLdNode => node !== null);

  if (products.length === 0) return null;

  return compact({
    '@type': 'ItemList',
    name: text(input.name),
    numberOfItems: products.length,
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: product,
    })),
  });
}
