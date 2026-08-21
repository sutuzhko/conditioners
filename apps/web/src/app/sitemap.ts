import type { MetadataRoute } from 'next';

import { db } from '@/server/db';
import { env } from '@/shared/config/env';
import { SITE_ROUTES, absoluteUrl, articlePath, productPath } from '@/shared/seo';

/**
 * Карта сайта — динамическая, из базы (docs/SEO.md §5).
 *
 * 🔴 Черновики статей и скрытые модели в неё не попадают: адрес в карте сайта
 * это обещание роботу, что страница есть и её стоит индексировать. Черновик,
 * попавший в карту, даёт 404 в Вебмастере и портит диагностику домена.
 *
 * Запрос идёт в базу напрямую, а не через репозиторий: карте нужны только
 * слаг и дата правки, а тянуть ради списка адресов весь каталог с фотографиями
 * и характеристиками — лишняя работа на каждой ревалидации.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, articles] = await Promise.all([
    db.product.findMany({
      where: { visible: true },
      select: { slug: true, updatedAt: true },
      orderBy: { sort: 'asc' },
    }),
    db.article.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { date: 'desc' },
    }),
  ]);

  // У статических страниц даты правки нет: их содержимое собирается из
  // нескольких источников сразу, и выдуманный `lastModified` хуже пустого.
  const statics = SITE_ROUTES.map((route) => ({ url: absoluteUrl(env.SITE_URL, route.path) }));

  return [
    ...statics,
    ...products.map((product) => ({
      url: absoluteUrl(env.SITE_URL, productPath(product.slug)),
      lastModified: product.updatedAt,
    })),
    ...articles.map((article) => ({
      url: absoluteUrl(env.SITE_URL, articlePath(article.slug)),
      lastModified: article.updatedAt,
    })),
  ];
}
