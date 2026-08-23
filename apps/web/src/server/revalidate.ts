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

import { ARTICLES_PATH, HOME_ROUTE, articlePath } from '@/shared/seo/routes';

/* Адреса берутся из карты сайта, а не повторяются здесь: своя копия уже
   разошлась с ней при переходе на английские адреса (ADR-042), и правки в
   админке сбрасывали кеш несуществующих страниц. После ADR-049 разделы —
   секции главной, поэтому каталог, цены и отзывы сбрасывают именно её. */
export const ROUTES = {
  home: HOME_ROUTE.path,
  knowledge: ARTICLES_PATH,
} as const;

/** Витрина и таблица сравнения живут на главной. */
export function revalidateCatalog(): void {
  revalidatePath(ROUTES.home);
}

/** Прайс, калькулятор и подписи «от N ₽» — секции главной. */
export function revalidatePrices(): void {
  revalidatePath(ROUTES.home);
}

export function revalidateArticles(slug?: string | null): void {
  revalidatePath(ROUTES.home);
  revalidatePath(ROUTES.knowledge);
  if (slug !== undefined && slug !== null) revalidatePath(articlePath(slug));
}

export function revalidateReviews(): void {
  revalidatePath(ROUTES.home);
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
 * Тело `POST /api/admin/revalidate` — docs/API.md §11. Схема живёт рядом с
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
