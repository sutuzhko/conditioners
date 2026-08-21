import type { Metadata } from 'next';

import { absoluteUrl, text } from './schema';

/**
 * Метаданные страницы (docs/SEO.md §3).
 *
 * 🔴 Ничего не хардкодится: заголовок собирает страница из своих данных,
 * суффикс бренда и картинка по умолчанию приходят из настроек (инвариант 5).
 * Каноникал абсолютный — относительный поисковик приведёт к своему домену.
 */

export type PageMetadataInput = {
  readonly siteUrl: string;
  /** Путь страницы: `/katalog`. */
  readonly path: string;
  readonly title: string;
  readonly description?: string | null | undefined;
  /** Суффикс бренда из настроек: «ТулаКлимат». Нет — заголовок остаётся как есть. */
  readonly titleSuffix?: string | null | undefined;
  /** Картинка страницы; нет своей — берётся дефолтная из настроек. */
  readonly image?: string | null | undefined;
  readonly type?: 'website' | 'article' | undefined;
  /** Название сайта для Open Graph — из настроек компании. */
  readonly siteName?: string | null | undefined;
  readonly noIndex?: boolean | undefined;
};

/** Разделитель суффикса — тот же, что в шаблонах docs/SEO.md §3. */
const SUFFIX_SEPARATOR = ' | ';

export function buildTitle(title: string, suffix: string | null | undefined): string | undefined {
  const base = text(title);
  const brand = text(suffix);

  if (base === undefined) return brand;
  if (brand === undefined || base.endsWith(brand)) return base;

  return `${base}${SUFFIX_SEPARATOR}${brand}`;
}

export function buildPageMetadata(input: PageMetadataInput): Metadata {
  const canonical = absoluteUrl(input.siteUrl, input.path);
  const title = buildTitle(input.title, input.titleSuffix);
  const description = text(input.description);
  const image = text(input.image);
  const siteName = text(input.siteName);

  const metadata: Metadata = {
    metadataBase: new URL(absoluteUrl(input.siteUrl)),
    alternates: { canonical },
    openGraph: {
      type: input.type ?? 'website',
      url: canonical,
      locale: 'ru_RU',
      ...(title === undefined ? {} : { title }),
      ...(description === undefined ? {} : { description }),
      ...(siteName === undefined ? {} : { siteName }),
      ...(image === undefined ? {} : { images: [absoluteUrl(input.siteUrl, image)] }),
    },
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
    ...(input.noIndex === true ? { robots: { index: false, follow: false } } : {}),
  };

  return metadata;
}
