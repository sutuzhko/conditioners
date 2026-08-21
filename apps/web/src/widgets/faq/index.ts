/**
 * Публичный API блока FAQ.
 *
 * `buildFaqItems` экспортируется намеренно: из него страница собирает разметку
 * `FAQPage` (docs/SEO.md §4). Источник вопросов один — видимый текст и
 * разметка разойтись не могут (инвариант 9).
 */
export { Faq } from './Faq';
export type { FaqProps } from './Faq';
export { buildFaqItems, faqContent } from './content';
export type { FaqEntry, FaqFacts } from './model';
