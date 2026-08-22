import { toReminderSchema } from '@/entities/lead/model';

/**
 * Форма напоминания о сезонном ТО — короткая точка сбора заявки в секции
 * сервиса (макет, «Напоминание о ТО»). Отсюда только типы; разметка живёт в
 * `ReminderForm.tsx`.
 *
 * 🔴 Схема клиента — та же схема сущности, которой сервер валидирует
 * `POST /api/leads/to-reminder`. Своих правил у формы нет намеренно:
 * расхождение клиента с сервером — это напоминания, которые человек считает
 * оформленными, а владелец не видит.
 */
export const reminderFormSchema = toReminderSchema;

export interface ReminderFormValues {
  readonly phone: string;
  /** Давность установки: от неё владелец считает, когда перезвонить. */
  readonly when: string;
  readonly consent: boolean;
}

/** Ошибки по именам полей: показываются под своим полем и ведут туда фокус. */
export type ReminderFieldErrors = Partial<Record<keyof ReminderFormValues, string>>;

/**
 * Порядок обхода полей. Он же порядок в разметке: фокус переводится на первую
 * ошибку сверху, а не на ту, что первой попалась Zod.
 */
export const REMINDER_FIELD_ORDER: readonly (keyof ReminderFormValues)[] = [
  'phone',
  'when',
  'consent',
];

/** Четыре состояния формы (docs/CLAUDE.md, раздел «Формы и состояния»). */
export type ReminderFormStatus = 'idle' | 'sending' | 'success' | 'error';

/** Результат отправки: ошибка сети — тоже результат, а не исключение. */
export type ReminderSubmitResult =
  | { readonly ok: true; readonly id: string }
  | { readonly ok: false; readonly message: string; readonly field?: string | undefined };
