import { CATALOG_NARROWING_PARAMS, CATALOG_PARAMS } from '@/entities/product/lib/catalogQuery';
import { env } from '@/shared/config/env';
import { LEAD_PARAMS } from '@/shared/config/lead';
import { CATALOG_PATH, COMPARE_PATH, HOME_ROUTE, absoluteUrl } from '@/shared/seo';

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

/** Параметры предмета заявки: имена — из одного места с формой (`shared/config/lead`). */
const LEAD_SUBJECT_PARAMS: readonly string[] = [LEAD_PARAMS.model, LEAD_PARAMS.topic];

function robotsTxt(siteUrl: string): string {
  const lines = [
    'User-agent: *',
    ...ALLOW.map((path) => `Allow: ${path}`),
    ...DISALLOW.map((path) => `Disallow: ${path}`),
    '',
    `Clean-param: ${CATALOG_NARROWING_PARAMS.join('&')} ${CATALOG_PATH}`,
    /* Отметки живут и на странице сравнения (ADR-121). Для робота её адрес с
       параметрами — состояние интерфейса, а не страница: сама она закрыта
       `noindex` и в карту сайта не попадает, но ссылки на неё с каталога
       робот увидит, и склейка избавляет его от обхода сотни одинаковых. */
    `Clean-param: ${CATALOG_PARAMS.compare} ${COMPARE_PATH}`,
    /* Предмет кнопки, ведущей к форме заявки (ADR-129). Содержимое главной он
       не меняет — это угол зрения на ту же страницу, и каноникал остаётся
       чистым. Путь `/` для Яндекса означает весь сайт: имена `model` и `topic`
       больше нигде не используются, а случайно приехавший параметр — такой же
       дубль, где бы он ни оказался. */
    `Clean-param: ${LEAD_SUBJECT_PARAMS.join('&')} ${HOME_ROUTE.path}`,
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
