/**
 * Публичный API блока «Монтаж»: этапы с таймлайном дня монтажа и оценка
 * экономии инвертора.
 *
 * 🔴 Блок в базу не ходит: сроки гарантии и ссылку на статью передаёт
 * страница (docs/ORCHESTRATION.md, «Блок не ходит в базу»).
 */
export { StepsTimeline } from './StepsTimeline';
export type { StepsTimelineProps } from './StepsTimeline';

export { SavingsBlock } from './SavingsBlock';
export type { SavingsBlockProps } from './SavingsBlock';

export { SAVINGS_MODEL, estimateSavings } from './lib';
export type { SavingsEstimate, SavingsInput } from './lib';
