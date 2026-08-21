import type { MetadataRoute } from 'next';

import { db } from '@/server/db';
import { env } from '@/shared/config/env';
import { SITE_ROUTES, absoluteUrl, articlePath } from '@/shared/seo';

/**
 * Карта сайта — динамическая, из базы (docs/SEO.md §5).
 *
 * 🔴 Черновики статей в неё не попадают: адрес в карте сайта — это обещание
 * роботу, что страница есть и её стоит индексировать. Черновик, попавший в
 * карту, даёт 404 в Вебмастере и портит диагностику домена.
 *
 * Запрос идёт в базу напрямую, а не через репозиторий: карте нужны только
 * слаг и дата правки, а тянуть ради списка адресов статьи целиком — лишняя
 * работа на каждой ревалидации.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const articles = await db.article.findMany({
    where: { published: true },
    select: { slug: true, updatedAt: true },
    orderBy: { date: 'desc' },
  });

  // У статических страниц даты правки нет: их содержимое собирается из
  // нескольких источников сразу, и выдуманный `lastModified` хуже пустого.
  const statics = SITE_ROUTES.map((route) => ({ url: absoluteUrl(env.SITE_URL, route.path) }));

  return [
    ...statics,
    ...articles.map((article) => ({
      url: absoluteUrl(env.SITE_URL, articlePath(article.slug)),
      lastModified: article.updatedAt,
    })),
  ];
}
