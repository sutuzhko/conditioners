/**
 * Публичный API блока «Цены». Страница импортирует отсюда и передаёт прайс и
 * ставки пропсами — сам блок в базу не ходит (docs/ORCHESTRATION.md).
 */
export { Pricing } from './Pricing';
export type { PricingProps } from './Pricing';
export type { CalculatorDefaults, EstimateContext, EstimateHandoff } from './model';
export { QTY_MAX, TRASSA_MAX_M } from './model';
