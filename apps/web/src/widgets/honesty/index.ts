/**
 * Публичный API блока «Честность о цене» — двух секций смыслового ядра сайта.
 *
 * 🔴 Блок в базу не ходит: тексты статические, минимальную цену монтажа и
 * ссылку на статью передаёт страница (docs/ORCHESTRATION.md).
 */
export { HonestPricing } from './HonestPricing';
export type { HonestPricingProps } from './HonestPricing';

export { ScamAccordion } from './ScamAccordion';
export type { ScamAccordionProps } from './ScamAccordion';

export { honestPoints, honestyContent, rivalPoints, scamContent, scamSchemes } from './content';
export type { HonestyPoint, ScamScheme } from './model';
