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
   * Путь страницы модели: `/catalog/split-09` (ADR-109).
   *
   * Необязателен: скрытая модель своей страницы не имеет, и заявлять её
   * адрес нельзя — ссылка в разметке это обещание роботу, которое закончится
   * 404.
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
  /** Путь страницы модели. Без него пункт списка остаётся без адреса. */
  readonly path?: string | undefined;
};

export type CatalogListInput = {
  readonly siteUrl: string;
  readonly items: readonly CatalogListEntry[];
  readonly name?: string | undefined;
};

/**
 * `ItemList` витрины и каталога: каждый пункт несёт вложенный `Product` с
 * ценой и адресом своей страницы (ADR-109).
 *
 * Товар описан прямо в списке, а не только ссылкой: Яндекс и Google читают
 * предложение, не дожидаясь обхода карточки. Адрес при этом обязателен для
 * товарного сниппета — `Offer` без своего URL остаётся перечислением.
 * Модель без пути (скрытая) в списке остаётся без адреса, а не получает
 * выдуманный.
 */
export function buildCatalogItemListJsonLd(input: CatalogListInput): JsonLdNode | null {
  const products = input.items
    .map((item) => ({
      node: buildProductJsonLd({ siteUrl: input.siteUrl, ...item }),
      url: item.path === undefined ? undefined : productUrl({ ...item, siteUrl: input.siteUrl }),
    }))
    .filter((entry): entry is { node: JsonLdNode; url: string | undefined } => entry.node !== null);

  if (products.length === 0) return null;

  return compact({
    '@type': 'ItemList',
    name: text(input.name),
    numberOfItems: products.length,
    itemListElement: products.map((entry, index) =>
      compact({
        '@type': 'ListItem',
        position: index + 1,
        url: entry.url,
        item: entry.node,
      }),
    ),
  });
}
