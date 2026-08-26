import type { MetadataRoute } from 'next';

import { db } from '@/server/db';
import { env } from '@/shared/config/env';
import { SITE_ROUTES, absoluteUrl, articlePath, productPath } from '@/shared/seo';

/**
 * Карта сайта — динамическая, из базы (docs/SEO.md §5).
 *
 * 🔴 В карту попадает только то, у чего есть страница: черновики статей и
 * снятые с продажи модели — нет. Адрес в карте сайта это обещание роботу, что
 * страница есть и её стоит индексировать; невыполненное обещание даёт 404 в
 * Вебмастере и портит диагностику домена. Ровно поэтому товарные адреса из
 * карты когда-то убрали (ADR-049) — теперь страницы существуют, и адреса
 * вернулись (ADR-109).
 *
 * Запросы идут в базу напрямую, а не через репозиторий: карте нужны только
 * слаг и дата правки, а тянуть ради списка адресов карточки целиком — лишняя
 * работа на каждой ревалидации.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, products] = await Promise.all([
    db.article.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true },
      orderBy: { date: 'desc' },
    }),
    db.product.findMany({
      where: { visible: true },
      select: { slug: true, updatedAt: true },
      orderBy: [{ sort: 'asc' }, { createdAt: 'asc' }],
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
