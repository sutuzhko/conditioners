import { formatDateIso } from '@/shared/lib/format';

import { absoluteUrl, compact, text, type JsonLdNode } from './schema';
import { organizationId } from './organization';

/**
 * `Article` для страницы Базы знаний (docs/SEO.md §4): `datePublished`,
 * `dateModified`, `author`, `image`.
 *
 * Автор — организация: статьи пишет компания, а выдуманное имя человека в
 * разметке ничем не лучше выдуманного отзыва. Нет названия компании в
 * настройках — нет и полей автора с издателем.
 */

/** Дата публикации — календарный день по времени Тулы, его задаёт владелец. */
const PUBLISH_TIME_ZONE = 'Europe/Moscow';

export type ArticleJsonLdInput = {
  readonly siteUrl: string;
  /** Путь статьи: `/baza-znaniy/invertor-ili-on-off`. */
  readonly path: string;
  readonly article: {
    readonly title: string;
    readonly excerpt?: string | null | undefined;
    readonly seoDescription?: string | null | undefined;
    readonly date: Date;
    readonly updatedAt?: Date | null | undefined;
    readonly cover?: string | null | undefined;
  };
  /** Есть ли в настройках заполненная компания: от этого зависят автор и издатель. */
  readonly hasOrganization?: boolean | undefined;
};

export function buildArticleJsonLd(input: ArticleJsonLdInput): JsonLdNode | null {
  const { article } = input;
  const headline = text(article.title);
  if (headline === undefined) return null;

  const url = absoluteUrl(input.siteUrl, input.path);
  const cover = text(article.cover);
  const publisher =
    input.hasOrganization === true ? { '@id': organizationId(input.siteUrl) } : undefined;

  return compact({
    '@type': 'Article',
    '@id': `${url}#article`,
    headline,
    description: text(article.seoDescription) ?? text(article.excerpt),
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    datePublished: formatDateIso(article.date, PUBLISH_TIME_ZONE),
    dateModified:
      article.updatedAt instanceof Date
        ? formatDateIso(article.updatedAt, PUBLISH_TIME_ZONE)
        : undefined,
    image: cover === undefined ? undefined : absoluteUrl(input.siteUrl, cover),
    inLanguage: 'ru-RU',
    author: publisher,
    publisher,
  });
}
