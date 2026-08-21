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
