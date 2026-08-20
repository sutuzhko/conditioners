/**
 * Точечная ревалидация после правок в админке — docs/TECH_DECISIONS §2.
 *
 * Страницы статические, поэтому сохранение в админке обязано само сбросить
 * кеш затронутых маршрутов: иначе владелец меняет цену и час смотрит на старую.
 *
 * Карта адресов — docs/SEO.md §1.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

export const ROUTES = {
  home: '/',
  catalog: '/katalog',
  prices: '/ceny',
  install: '/ustanovka-kondicionerov',
  service: '/remont-i-obsluzhivanie',
  reviews: '/otzyvy',
  contacts: '/kontakty',
  knowledge: '/baza-znaniy',
} as const;

function revalidateMany(paths: readonly string[]): void {
  for (const path of paths) revalidatePath(path);
}

/** Витрина живёт на главной, в каталоге и в карточке модели. */
export function revalidateCatalog(slug?: string | null): void {
  revalidateMany([ROUTES.home, ROUTES.catalog]);
  if (slug !== undefined && slug !== null) revalidatePath(`${ROUTES.catalog}/${slug}`);
}

/** Цены и ставки видны в таблице цен, в калькуляторе и в подписях на страницах услуг. */
export function revalidatePrices(): void {
  revalidateMany([ROUTES.home, ROUTES.prices, ROUTES.install, ROUTES.service, ROUTES.catalog]);
}

export function revalidateArticles(slug?: string | null): void {
  revalidateMany([ROUTES.home, ROUTES.knowledge]);
  if (slug !== undefined && slug !== null) revalidatePath(`${ROUTES.knowledge}/${slug}`);
}

export function revalidateReviews(): void {
  revalidateMany([ROUTES.home, ROUTES.reviews]);
}

/**
 * Данные компании стоят в шапке и футере, то есть на каждой странице сайта —
 * поэтому сохранение любой группы настроек сбрасывает весь корневой layout
 * (docs/API.md §5).
 */
export function revalidateEverything(): void {
  revalidatePath('/', 'layout');
}

/**
 * Тело `POST /api/admin/revalidate` — docs/API.md §10. Схема живёт рядом с
 * ревалидацией, а не среди сущностей: ревалидация маршрутов — это про
 * устройство приложения, а не про предметную область.
 */
export const revalidateSchema = z
  .object({
    paths: z.array(z.string().trim().startsWith('/', 'Путь начинается со слэша')).min(1).max(50),
    scope: z.enum(['page', 'layout']).optional(),
  })
  .strict();

export function revalidateRoutes(
  paths: readonly string[],
  scope: 'page' | 'layout' = 'page',
): void {
  for (const path of paths) revalidatePath(path, scope);
}
