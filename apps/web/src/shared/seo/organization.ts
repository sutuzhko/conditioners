import type { Address, Company, Contacts, Seo, Social } from '@/entities/settings/model';

import { absoluteUrl, compact, oneOrMany, text, textList, type JsonLdNode } from './schema';

/**
 * `Organization`, `WebSite` и `PostalAddress` — на всех страницах (docs/SEO.md §4).
 *
 * 🔴 Собираются только из настроек компании. Телефон и адрес в разметке, в
 * шапке, в футере и в карточке Яндекс.Бизнеса обязаны совпадать до символа;
 * пока источник один — рассинхронизировать их невозможно (ADR-009).
 */

/** Группы настроек, из которых собирается организация. Любая может быть пустой. */
export type OrganizationParts = {
  readonly siteUrl: string;
  readonly company?: Company | null | undefined;
  /**
   * Наименование организации — уже собранная строка, ровно та, что напечатана
   * в реквизитах футера (`legalTitle` в `entities/settings/lib/legal`).
   * Собирает её страница: сборщики разметки живут в `shared` и до доменных
   * функций не дотягиваются, а два независимых поля здесь уже расходились
   * (ADR-106, инвариант 9).
   */
  readonly legalName?: string | null | undefined;
  readonly contacts?: Contacts | null | undefined;
  readonly address?: Address | null | undefined;
  readonly social?: Social | null | undefined;
  readonly seo?: Seo | null | undefined;
};

/**
 * Постоянные идентификаторы узлов: на них ссылаются `Product.offers.seller`,
 * `Service.provider` и `Article.publisher`, чтобы поисковик видел одну
 * организацию, а не по копии на каждой странице.
 */
export function organizationId(siteUrl: string): string {
  return `${absoluteUrl(siteUrl)}#organization`;
}

export function webSiteId(siteUrl: string): string {
  return `${absoluteUrl(siteUrl)}#website`;
}

/**
 * Почтовый адрес из частей. Адрес хранится по полям именно ради этого:
 * `PostalAddress` требует их отдельно, а Яндекс.Бизнес сверяет построчно.
 */
export function buildPostalAddress(address: Address | null | undefined): JsonLdNode | undefined {
  if (!address) return undefined;

  const street = textList([address.street, address.building, address.office]);
  const region = text(address.region);
  const locality = text(address.city);
  const postalCode = text(address.postalCode);

  // Код страны в схеме имеет значение по умолчанию, поэтому сам по себе он не
  // адрес: «RU» без города и улицы не совпадёт с карточкой Яндекс.Бизнеса ни
  // одной строкой, а поле в разметке уже будет заявлено.
  if (
    region === undefined &&
    locality === undefined &&
    street === undefined &&
    postalCode === undefined
  ) {
    return undefined;
  }

  return compact({
    '@type': 'PostalAddress',
    addressCountry: text(address.country),
    addressRegion: region,
    addressLocality: locality,
    streetAddress: street === undefined ? undefined : street.join(', '),
    postalCode,
  });
}

/** Ссылки на соцсети и карты для `sameAs`. */
export function buildSameAs(social: Social | null | undefined): readonly string[] | undefined {
  return textList(social?.links);
}

/**
 * `Organization`.
 *
 * Без названия компании узла нет вовсе: организация без имени не даёт
 * поисковику ничего, а подставить название в код запрещено (инвариант 8).
 */
export function buildOrganizationJsonLd(parts: OrganizationParts): JsonLdNode | null {
  const name = text(parts.company?.name);
  if (name === undefined) return null;

  const { siteUrl } = parts;
  const foundedYear = parts.company?.foundedYear;

  return compact({
    '@type': 'Organization',
    '@id': organizationId(siteUrl),
    name,
    legalName: text(parts.legalName),
    slogan: text(parts.company?.tagline),
    foundingDate: typeof foundedYear === 'number' ? String(foundedYear) : undefined,
    url: absoluteUrl(siteUrl),
    image:
      text(parts.seo?.ogImage) === undefined
        ? undefined
        : absoluteUrl(siteUrl, parts.seo?.ogImage ?? ''),
    telephone: oneOrMany(textList(parts.contacts?.phones)),
    email: text(parts.contacts?.email),
    address: buildPostalAddress(parts.address),
    sameAs: buildSameAs(parts.social),
  });
}

/**
 * `WebSite`. Поиска по сайту нет, поэтому и `potentialAction` нет: заявленное
 * и несуществующее действие — то же расхождение разметки и содержимого.
 */
export function buildWebSiteJsonLd(parts: OrganizationParts): JsonLdNode | null {
  const name = text(parts.company?.name);
  if (name === undefined) return null;

  return compact({
    '@type': 'WebSite',
    '@id': webSiteId(parts.siteUrl),
    url: absoluteUrl(parts.siteUrl),
    name,
    inLanguage: 'ru-RU',
    publisher: { '@id': organizationId(parts.siteUrl) },
  });
}
