import type { MetadataRoute } from 'next';

import { env } from '@/shared/config/env';
import { absoluteUrl } from '@/shared/seo';

/**
 * `robots.txt` (docs/SEO.md §5).
 *
 * Закрыты админка и API: индексировать там нечего, а страницы входа и ручки
 * контракта в выдаче — только повод для диагностики Вебмастера. Исключение —
 * `/api/media`: оттуда отдаются фото товаров и обложки статей, на которые
 * ссылаются JSON-LD и og:image; закрытый для робота адрес картинки выбивает
 * её из Яндекс.Картинок и расширенных сниппетов. Адрес карты сайта
 * абсолютный: относительный путь в `Sitemap:` не читает ни один робот.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/api/media/'],
        disallow: ['/admin', '/api'],
      },
    ],
    sitemap: absoluteUrl(env.SITE_URL, '/sitemap.xml'),
  };
}
