/**
 * Карта статических URL сайта — docs/SEO.md §1.
 *
 * Один список кормит карту сайта и навигацию страницы 404: адрес, которого
 * нет в этом файле, не попадёт ни туда, ни туда. Пути записаны строками, а не
 * типизированными маршрутами: карта сайта и `robots` собираются вне
 * маршрутизации.
 *
 * Сайт — лендинг: разделы услуг живут секциями главной (ADR-049). Свои
 * адреса есть у каталога и моделей (ADR-109), у статей, их листинга и
 * политики. Динамические адреса (`/catalog/[slug]`, `/knowledge/[slug]`)
 * приходят из базы, а не отсюда.
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
   английские адреса (ADR-042) осталась русской — правки в админке сбрасывали
   кеш несуществующих страниц, то есть не сбрасывали ничего. */
export const CATALOG_PATH = '/catalog';
export const ARTICLES_PATH = '/knowledge';
export const PRIVACY_PATH = '/privacy';

export const SITE_ROUTES: readonly SiteRoute[] = [
  HOME_ROUTE,
  { path: CATALOG_PATH, title: 'Каталог' },
  { path: ARTICLES_PATH, title: 'База знаний' },
  { path: PRIVACY_PATH, title: 'Политика обработки персональных данных' },
];

/** Адрес модели: `/catalog/split-09` (ADR-109). */
export function productPath(slug: string): string {
  return `${CATALOG_PATH}/${slug}`;
}

export function articlePath(slug: string): string {
  return `${ARTICLES_PATH}/${slug}`;
}
