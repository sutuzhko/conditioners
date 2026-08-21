/**
 * Публичный API формы отзыва. Она нужна и на главной, и на `/reviews`,
 * поэтому живёт в `features`, а не внутри блока отзывов.
 */
export { ReviewForm } from './ReviewForm';
export type { ReviewFormProps } from './ReviewForm';
export { DISTRICT_OPTIONS } from './content';
export type { ReviewSubmit, ReviewSubmitResult } from './model';
