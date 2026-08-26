import { CATALOG_NARROWING_PARAMS } from '@/entities/product/lib/catalogQuery';
import { env } from '@/shared/config/env';
import { CATALOG_PATH, absoluteUrl } from '@/shared/seo';

/**
 * `robots.txt` (docs/SEO.md §5).
 *
 * Закрыты админка и API: индексировать там нечего, а страницы входа и ручки
 * контракта в выдаче — только повод для диагностики Вебмастера. Исключение —
 * `/api/media`: оттуда отдаются фото товаров и обложки статей, на которые
 * ссылаются JSON-LD и og:image; закрытый для робота адрес картинки выбивает
 * её из Яндекс.Картинок и расширенных сниппетов. Адрес карты сайта
 * абсолютный: относительный путь в `Sitemap:` не читает ни один робот.
 *
 * 🔴 Обычный обработчик маршрута, а не `app/robots.ts`: типизированный
 * конвейер Next умеет ровно `Allow`, `Disallow`, `Crawl-delay` и `Sitemap`, а
 * каталогу нужен `Clean-param` (ADR-109) — директива Яндекса, которая снимает
 * дубли по параметрам фильтра до обхода, на стороне робота. Без неё фильтры
 * уедут в индекс сотней адресов с одним и тем же товаром.
 *
 * Параметров разбивки (`page`) в `Clean-param` нет намеренно: у второй
 * страницы содержимое действительно другое, и склейка выкинула бы половину
 * ассортимента из индекса.
 */
export const dynamic = 'force-static';

const ALLOW: readonly string[] = ['/', '/api/media/'];
const DISALLOW: readonly string[] = ['/admin', '/api'];

function robotsTxt(siteUrl: string): string {
  const lines = [
    'User-agent: *',
    ...ALLOW.map((path) => `Allow: ${path}`),
    ...DISALLOW.map((path) => `Disallow: ${path}`),
    '',
    `Clean-param: ${CATALOG_NARROWING_PARAMS.join('&')} ${CATALOG_PATH}`,
    '',
    `Sitemap: ${absoluteUrl(siteUrl, '/sitemap.xml')}`,
  ];

  return `${lines.join('\n')}\n`;
}

export function GET(): Response {
  return new Response(robotsTxt(env.SITE_URL), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
