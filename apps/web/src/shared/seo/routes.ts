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

/**
 * Параметр рубрики листинга Базы знаний: `/knowledge?category=vybor`.
 *
 * 🔴 Живёт здесь, а не в странице: имя параметра — часть карты URL, и его
 * обязаны знать и страница (каноникал), и `robots.txt` (`Clean-param`).
 * Разъехавшись, они дали бы ровно тот дубль, который снимают.
 */
export const ARTICLES_CATEGORY_PARAM = 'category';
export const PRIVACY_PATH = '/privacy';

/**
 * Сравнение моделей (ADR-121).
 *
 * 🔴 В `SITE_ROUTES` его нет намеренно, и добавлять нельзя: список идёт в
 * карту сайта и в хлебные крошки, а `/compare` закрыт от индекса. Без
 * параметров у страницы нет содержимого, с параметрами это состояние
 * интерфейса, а не страница. Константа же нужна и ссылкам каталога, и
 * правилу `Clean-param` в `robots.txt`.
 */
export const COMPARE_PATH = '/compare';

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
