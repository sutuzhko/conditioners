import type { Geo, Payment, ServiceArea } from '@/entities/settings/model';

import { absoluteUrl, compact, num, oneOrMany, text, textList, type JsonLdNode } from './schema';
import {
  buildPostalAddress,
  buildSameAs,
  organizationId,
  type OrganizationParts,
} from './organization';
import {
  buildAggregateRatingJsonLd,
  buildReviewsJsonLd,
  type AggregateRatingOptions,
  type ReviewForSchema,
} from './reviews';

/**
 * `HVACBusiness` — главная и контакты (docs/SEO.md §4): адрес по частям,
 * телефон, часы, `areaServed`, координаты.
 *
 * 🔴 Всё до последнего поля приходит из настроек компании (инвариант 8).
 * Часы берутся машинной строкой, которую владелец задаёт рядом с человеческой:
 * вывести `Mo-Su 08:00-21:00` из «Пн–Вс, 8:00–21:00» надёжно нельзя, а
 * расхождение видимых часов и разметки — расхождение контента и разметки.
 */

export type LocalBusinessParts = OrganizationParts & {
  readonly geo?: Geo | null | undefined;
  readonly area?: ServiceArea | null | undefined;
  readonly payment?: Payment | null | undefined;
  /** 🔴 Только настоящие одобренные отзывы — те же, что видны на странице. */
  readonly reviews?: readonly ReviewForSchema[] | null | undefined;
  readonly rating?: AggregateRatingOptions | undefined;
};

export function localBusinessId(siteUrl: string): string {
  return `${absoluteUrl(siteUrl)}#business`;
}

/** Координаты. Одной широты без долготы не бывает — либо обе, либо поля нет. */
function buildGeo(geo: Geo | null | undefined): JsonLdNode | undefined {
  const latitude = num(geo?.lat);
  const longitude = num(geo?.lng);
  if (latitude === undefined || longitude === undefined) return undefined;

  return { '@type': 'GeoCoordinates', latitude, longitude };
}

/**
 * Регион обслуживания и районы. Район города — административная территория,
 * поэтому один тип на весь список: `City` для «Пролетарского» был бы враньём.
 */
function buildAreaServed(area: ServiceArea | null | undefined): readonly JsonLdNode[] | undefined {
  const names = textList([area?.served ?? '', ...(area?.districts ?? [])]);
  if (names === undefined) return undefined;

  return names.map((name) => ({ '@type': 'AdministrativeArea', name }));
}

export function buildLocalBusinessJsonLd(parts: LocalBusinessParts): JsonLdNode | null {
  const name = text(parts.company?.name);
  if (name === undefined) return null;

  const { siteUrl } = parts;
  const ogImage = text(parts.seo?.ogImage);

  return compact({
    '@type': 'HVACBusiness',
    '@id': localBusinessId(siteUrl),
    name,
    url: absoluteUrl(siteUrl),
    image: ogImage === undefined ? undefined : absoluteUrl(siteUrl, ogImage),
    description: text(parts.company?.tagline),
    telephone: oneOrMany(textList(parts.contacts?.phones)),
    email: text(parts.contacts?.email),
    address: buildPostalAddress(parts.address),
    geo: buildGeo(parts.geo),
    openingHours: oneOrMany(textList(parts.contacts?.openingHours)),
    areaServed: buildAreaServed(parts.area),
    paymentAccepted: oneOrMany(textList(parts.payment?.methods)),
    sameAs: buildSameAs(parts.social),
    parentOrganization: { '@id': organizationId(siteUrl) },
    aggregateRating: buildAggregateRatingJsonLd(parts.reviews, parts.rating ?? {}) ?? undefined,
    review: buildReviewsJsonLd(parts.reviews),
  });
}
