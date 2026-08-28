import { leadInputSchema } from '@/entities/lead/model';

/**
 * Форма заявки — переиспользуемая фича: она стоит и на главной, и на каждой
 * странице кластера. Отсюда только типы; разметка живёт в `LeadForm.tsx`.
 */

/**
 * 🔴 Схема клиента — та же схема сущности, что валидирует сервер, за вычетом
 * полей происхождения: `sourceUrl`, `referrer` и utm-метки собирает сервер сам
 * из заголовков (docs/API.md §8). Своих правил у формы нет намеренно:
 * расхождение клиента с сервером — это молча теряемые заявки.
 */
export const leadFormSchema = leadInputSchema.omit({ sourceUrl: true, referrer: true, utm: true });

/** Значения полей формы. Всё, кроме согласия, — строки: их отдают контролы. */
export interface LeadFormValues {
  readonly name: string;
  readonly phone: string;
  readonly topic: string;
  /**
   * Модель, ради которой нажали кнопку (ADR-129). Свободный текст: подстановка
   * из адреса — подсказка, а не замок, и человек вправе её стереть или
   * переписать.
   */
  readonly model: string;
  readonly place: string;
  readonly qty: string;
  readonly callTime: string;
  readonly address: string;
  readonly comment: string;
  readonly consent: boolean;
}

/**
 * Модель каталога для подстановки: слаг приходит в адресе, а в поле формы
 * встаёт название — слаг человеку ни о чём не говорит (ADR-129).
 */
export interface LeadModelOption {
  readonly slug: string;
  readonly name: string;
}

/** Ошибки по именам полей: показываются под своим полем и ведут туда фокус. */
export type LeadFieldErrors = Partial<Record<keyof LeadFormValues, string>>;

/**
 * Порядок обхода полей. Он же порядок в разметке: фокус переводится на первую
 * ошибку сверху, а не на ту, что первой попалась Zod.
 *
 * Количество поднялось к типу помещения: «Модель» заняла целую строку, и пара
 * ей досталась соседняя по смыслу — где ставим и сколько блоков.
 */
export const LEAD_FIELD_ORDER: readonly (keyof LeadFormValues)[] = [
  'name',
  'phone',
  'topic',
  'model',
  'place',
  'qty',
  'address',
  'callTime',
  'comment',
  'consent',
];

/** Четыре состояния формы (docs/CLAUDE.md, раздел «Формы и состояния»). */
export type LeadFormStatus = 'idle' | 'sending' | 'success' | 'error';

/**
 * Итог отправки. Ошибка всегда несёт текст для человека: технические
 * подробности остаются в консоли сети, а не в интерфейсе.
 */
export type LeadSubmitResult =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly message: string; readonly field?: string | undefined };

/** Отправка заявки. Подменяется в историях и тестах, по умолчанию — `postLead`. */
export type LeadSubmit = (data: FormData) => Promise<LeadSubmitResult>;
