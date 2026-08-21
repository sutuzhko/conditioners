/**
 * Карта статических URL сайта — docs/SEO.md §1.
 *
 * Один список кормит карту сайта и навигацию страницы 404: адрес, которого
 * нет в этом файле, не попадёт ни туда, ни туда. Пути записаны строками, а не
 * типизированными маршрутами: карта сайта и `robots` собираются вне
 * маршрутизации, а страницы кластера появляются волнами — литерал
 * несуществующего маршрута при `typedRoutes` ломает сборку.
 *
 * Гео-страницы `/rayony/*` — вторая волна (docs/SEO.md §1), их здесь нет.
 * Динамические адреса (`/catalog/[slug]`, `/knowledge/[slug]`) приходят из
 * базы, а не отсюда.
 */

export type SiteRoute = {
  readonly path: string;
  /** Подпись для навигации: хлебные крошки и страница 404. */
  readonly title: string;
};

export const HOME_ROUTE: SiteRoute = { path: '/', title: 'Главная' };

/** Разделы каталога и статей: их адреса строятся из слага. */
export const CATALOG_PATH = '/catalog';
export const ARTICLES_PATH = '/knowledge';
export const PRIVACY_PATH = '/privacy';

export const SITE_ROUTES: readonly SiteRoute[] = [
  HOME_ROUTE,
  { path: CATALOG_PATH, title: 'Каталог кондиционеров' },
  { path: '/installation', title: 'Установка кондиционеров' },
  { path: '/prices', title: 'Цены на монтаж' },
  { path: '/service', title: 'Ремонт и обслуживание' },
  { path: '/reviews', title: 'Отзывы' },
  { path: ARTICLES_PATH, title: 'База знаний' },
  { path: '/contacts', title: 'Контакты' },
  { path: PRIVACY_PATH, title: 'Политика обработки персональных данных' },
];

export function productPath(slug: string): string {
  return `${CATALOG_PATH}/${slug}`;
}

export function articlePath(slug: string): string {
  return `${ARTICLES_PATH}/${slug}`;
}
