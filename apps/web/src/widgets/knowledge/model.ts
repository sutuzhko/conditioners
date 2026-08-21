import type { Article } from '@/entities/article/model';

/**
 * Что тизеру нужно от статьи.
 *
 * Не весь `Article`: `body`, `published` и SEO-поля читает страница статьи, а
 * витрине они не нужны. Тип собран через `Pick`, как `CatalogProduct` и
 * `ReviewCardData`, — тогда фикстуре не приходится выдумывать поля, которые
 * блок всё равно не рисует.
 *
 * 🔴 Блок в базу не ходит: отбор опубликованных статей и их порядок — дело
 * страницы (docs/ORCHESTRATION.md, «Блок не ходит в базу»).
 */
export type ArticleTeaser = Pick<
  Article,
  'id' | 'slug' | 'title' | 'category' | 'date' | 'minutes' | 'excerpt' | 'cover'
>;
