/**
 * Карта статических URL сайта — docs/SEO.md §1.
 *
 * Один список кормит карту сайта и навигацию страницы 404: адрес, которого
 * нет в этом файле, не попадёт ни туда, ни туда. Пути записаны строками, а не
 * типизированными маршрутами: карта сайта и `robots` собираются вне
 * маршрутизации, а страницы кластера появляются волнами.
 *
 * Гео-страницы `/rayony/*` — вторая волна (docs/SEO.md §1), их здесь нет.
 * Динамические адреса (`/katalog/[slug]`, `/baza-znaniy/[slug]`) приходят из
 * базы, а не отсюда.
 */

export type SiteRoute = {
  readonly path: string;
  /** Подпись для навигации: хлебные крошки и страница 404. */
  readonly title: string;
};

export const HOME_ROUTE: SiteRoute = { path: '/', title: 'Главная' };

export const SITE_ROUTES: readonly SiteRoute[] = [
  HOME_ROUTE,
  { path: '/katalog', title: 'Каталог кондиционеров' },
  { path: '/ustanovka-kondicionerov', title: 'Установка кондиционеров' },
  { path: '/ceny', title: 'Цены на монтаж' },
  { path: '/remont-i-obsluzhivanie', title: 'Ремонт и обслуживание' },
  { path: '/otzyvy', title: 'Отзывы' },
  { path: '/baza-znaniy', title: 'База знаний' },
  { path: '/kontakty', title: 'Контакты' },
  { path: '/politika-konfidencialnosti', title: 'Политика обработки персональных данных' },
];

/** Разделы каталога и статей: их адреса строятся из слага. */
export const CATALOG_PATH = '/katalog';
export const ARTICLES_PATH = '/baza-znaniy';

export function productPath(slug: string): string {
  return `${CATALOG_PATH}/${slug}`;
}

export function articlePath(slug: string): string {
  return `${ARTICLES_PATH}/${slug}`;
}
