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

export { SAVINGS_MODEL, estimateSavings, isNightHour } from './lib';
export type { SavingsEstimate, SavingsInput } from './lib';

/** Режим тарифа нужен странице, чтобы задать блоку стартовое значение. */
export type { TariffMode } from './model';
