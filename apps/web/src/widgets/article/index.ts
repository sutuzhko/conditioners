/**
 * Публичный API Базы знаний. Страницы импортируют отсюда и передают данные
 * пропсами — сами блоки в базу не ходят (docs/ORCHESTRATION.md).
 */
export { ArticleList } from './ArticleList';
export type { ArticleListProps } from './ArticleList';
export { ArticleView } from './ArticleView';
export type { ArticleViewProps } from './ArticleView';
export { ArticleBody } from './ArticleBody';
export type { ArticleBodyProps } from './ArticleBody';
export type { ArticleFull, ArticleLink, ArticleTeaser } from './model';
/* Отбор и разбивка нужны и странице: из них она берёт номер реально
   показанной страницы для каноникала (docs/SEO.md §5). */
export { selectArticles, ARTICLES_PAGE_SIZE } from './lib';
export type { ArticleCategory, ArticleSelection } from './lib';
