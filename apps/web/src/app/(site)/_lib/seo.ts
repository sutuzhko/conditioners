import type { Metadata } from 'next';

import { env } from '@/shared/config/env';

/**
 * Метаданные страниц кластера: `title`, `description` и абсолютный каноникал
 * (docs/SEO.md §3, инвариант 5).
 *
 * Каноникал строится из `SITE_URL` — единственного параметра, который живёт не
 * в админке, а в окружении. Относительный каноникал допустим по спецификации,
 * но Яндекс на нём периодически ошибается, а домен всё равно ровно один.
 *
 * `robots` здесь намеренно не переопределяется: до заполнения раздела
 * «Компания» весь сайт закрыт от индексации в корневом layout, и страница
 * кластера не имеет права открыть себя в обход этого решения.
 */
export type PageMetadataInput = {
  /** Путь страницы, начиная со слэша и без завершающего: `/catalog`. */
  readonly path: string;
  readonly title: string;
  readonly description: string;
};

export function absoluteUrl(path: string): string {
  return new URL(path, env.SITE_URL).toString();
}

export function pageMetadata({ path, title, description }: PageMetadataInput): Metadata {
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
  };
}
