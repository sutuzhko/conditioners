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

/* Каждый адрес — именованная константа, а не литерал в списке ниже: адреса
   нужны и ревалидации в админке, и навигации, и карте сайта. Пока они были
   литералами, копия карты жила в `server/revalidate.ts` и после перехода на
   английские адреса (ADR-042) осталась русской — сохранение в админке
   сбрасывало кеш несуществующих страниц, то есть не сбрасывало ничего.
   В деве это незаметно: там страница пересобирается на каждый запрос. */
export const CATALOG_PATH = '/catalog';
export const INSTALL_PATH = '/installation';
export const PRICES_PATH = '/prices';
export const SERVICE_PATH = '/service';
export const REVIEWS_PATH = '/reviews';
export const ARTICLES_PATH = '/knowledge';
export const CONTACTS_PATH = '/contacts';
export const PRIVACY_PATH = '/privacy';

export const SITE_ROUTES: readonly SiteRoute[] = [
  HOME_ROUTE,
  { path: CATALOG_PATH, title: 'Каталог кондиционеров' },
  { path: INSTALL_PATH, title: 'Установка кондиционеров' },
  { path: PRICES_PATH, title: 'Цены на монтаж' },
  { path: SERVICE_PATH, title: 'Ремонт и обслуживание' },
  { path: REVIEWS_PATH, title: 'Отзывы' },
  { path: ARTICLES_PATH, title: 'База знаний' },
  { path: CONTACTS_PATH, title: 'Контакты' },
  { path: PRIVACY_PATH, title: 'Политика обработки персональных данных' },
];

export function productPath(slug: string): string {
  return `${CATALOG_PATH}/${slug}`;
}

export function articlePath(slug: string): string {
  return `${ARTICLES_PATH}/${slug}`;
}
