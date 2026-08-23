import type { ServiceArea } from '@/entities/settings/model';

import {
  PRICE_CURRENCY,
  absoluteUrl,
  compact,
  num,
  text,
  textList,
  type JsonLdNode,
} from './schema';
import { organizationId } from './organization';

/**
 * `Service` + `OfferCatalog` для страниц услуг и `PriceSpecification` для цен
 * (docs/SEO.md §4).
 *
 * 🔴 Позиции каталога — те же строки, что человек видит в таблице цен: список
 * приходит параметром, разметка его не досочиняет (инвариант 9).
 */

export type ServiceOfferInput = {
  readonly name: string;
  readonly description?: string | null | undefined;
  /** Цена позиции, ₽. Нет цены — нет `PriceSpecification`, а не ноль. */
  readonly price?: number | null | undefined;
  /** Цена «от»: в разметке это `minPrice`, а не точная цена. */
  readonly from?: boolean | undefined;
  /** Единица, к которой относится цена: «за метр трассы». */
  readonly unitText?: string | null | undefined;
};

export type ServiceJsonLdInput = {
  readonly siteUrl: string;
  /** Путь страницы услуги: `/installation`. */
  readonly path: string;
  readonly name: string;
  readonly description?: string | null | undefined;
  readonly serviceType?: string | null | undefined;
  readonly area?: ServiceArea | null | undefined;
  readonly offers?: readonly ServiceOfferInput[] | undefined;
  /** Заголовок прайса — тот же, что над таблицей цен. */
  readonly catalogName?: string | null | undefined;
};

function buildPriceSpecification(offer: ServiceOfferInput): JsonLdNode | undefined {
  const price = num(offer.price);
  if (price === undefined) return undefined;

  return compact({
    '@type': 'PriceSpecification',
    priceCurrency: PRICE_CURRENCY,
    price: offer.from === true ? undefined : price,
    minPrice: offer.from === true ? price : undefined,
    unitText: text(offer.unitText),
  });
}

function buildOffer(offer: ServiceOfferInput): JsonLdNode | null {
  const name = text(offer.name);
  if (name === undefined) return null;

  return compact({
    '@type': 'Offer',
    itemOffered: compact({
      '@type': 'Service',
      name,
      description: text(offer.description),
    }),
    priceSpecification: buildPriceSpecification(offer),
  });
}

function buildAreaServed(area: ServiceArea | null | undefined): readonly JsonLdNode[] | undefined {
  const names = textList([area?.served ?? '']);
  if (names === undefined) return undefined;
  return names.map((name) => ({ '@type': 'AdministrativeArea', name }));
}

export function buildServiceJsonLd(input: ServiceJsonLdInput): JsonLdNode | null {
  const name = text(input.name);
  if (name === undefined) return null;

  const url = absoluteUrl(input.siteUrl, input.path);

  const offers = (input.offers ?? [])
    .map(buildOffer)
    .filter((offer): offer is JsonLdNode => offer !== null);

  const catalog =
    offers.length === 0
      ? undefined
      : compact({
          '@type': 'OfferCatalog',
          name: text(input.catalogName) ?? name,
          itemListElement: offers,
        });

  return compact({
    '@type': 'Service',
    '@id': `${url}#service`,
    name,
    description: text(input.description),
    serviceType: text(input.serviceType),
    url,
    provider: { '@id': organizationId(input.siteUrl) },
    areaServed: buildAreaServed(input.area),
    hasOfferCatalog: catalog,
  });
}
