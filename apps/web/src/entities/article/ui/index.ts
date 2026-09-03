/**
 * Представления статьи. Карточку рисуют и тизер главной, и листинг Базы
 * знаний — импорт вбок между виджетами запрещён правилом слоёв, поэтому
 * общее представление живёт в сущности.
 */
export { ArticleCard } from './ArticleCard';
export type { ArticleCardProps } from './ArticleCard';
export { articleLabels } from './content';
