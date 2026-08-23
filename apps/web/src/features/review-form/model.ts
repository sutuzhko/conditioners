import { reviewInputSchema } from '@/entities/review/model';

/**
 * Форма отзыва — переиспользуемая фича: она нужна и на главной, и на `/reviews`
 * (docs/ORCHESTRATION.md, вентиль перед блоковой волной). Отсюда только типы;
 * разметка живёт в `ReviewForm.tsx`.
 */

/**
 * 🔴 Схема клиента — ровно та же схема сущности, которой сервер валидирует
 * `POST /api/reviews` (`server/intake/schemas.ts`). Своих правил у формы нет
 * намеренно: расхождение клиента с сервером — это отзывы, которые человек
 * считает отправленными, а модератор не видит.
 */
export const reviewFormSchema = reviewInputSchema;

/**
 * Значения полей формы. Оценка числом, а не строкой: её отдаёт `Rating`,
 * а не текстовый контрол.
 */
export interface ReviewFormValues {
  readonly name: string;
  readonly rating: number;
  readonly text: string;
  readonly consent: boolean;
}

/** Оценка не выбрана. Ноль звёзд поставить нельзя — шкала начинается с единицы. */
export const RATING_UNSET = 0;

/** Ошибки по именам полей: показываются под своим полем и ведут туда фокус. */
export type ReviewFieldErrors = Partial<Record<keyof ReviewFormValues, string>>;

/**
 * Порядок обхода полей. Он же порядок в разметке: фокус переводится на первую
 * ошибку сверху, а не на ту, что первой попалась Zod.
 */
export const REVIEW_FIELD_ORDER: readonly (keyof ReviewFormValues)[] = [
  'name',
  'rating',
  'text',
  'consent',
];

/** Четыре состояния формы (docs/CLAUDE.md, раздел «Формы и состояния»). */
export type ReviewFormStatus = 'idle' | 'sending' | 'success' | 'error';

/**
 * Итог отправки. Ошибка всегда несёт текст для человека: технические
 * подробности остаются в консоли сети, а не в интерфейсе.
 */
export type ReviewSubmitResult =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly message: string; readonly field?: string | undefined };

/** Отправка отзыва. Подменяется в историях и тестах, по умолчанию — `postReview`. */
export type ReviewSubmit = (data: FormData) => Promise<ReviewSubmitResult>;
