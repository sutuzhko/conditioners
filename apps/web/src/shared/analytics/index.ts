/**
 * Публичный API аналитики: счётчик Метрики, имена целей и метки Вебвизора
 * (ADR-024, docs/SEO.md §6). Сторонних скриптов, кроме счётчика, на сайте нет.
 */

export { Metrika } from './Metrika';
export type { MetrikaProps } from './Metrika';

export { METRIKA_GOALS, YM_MASK, reachGoal } from './goals';
export type { MetrikaGoal } from './goals';
