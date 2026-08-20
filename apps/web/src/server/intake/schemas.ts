import { z } from 'zod';
import { leadInputSchema, toReminderSchema } from '@/entities/lead/model';
import { reviewInputSchema } from '@/entities/review/model';

/**
 * Схемы публичных форм на стороне сервера.
 *
 * 🔴 Источник истины — схемы сущностей (`entities/lead`, `entities/review`):
 * ими же валидируют формы на клиенте. Здесь только то, что относится к
 * приёму `multipart/form-data`, а не к самой сущности: приведение полей
 * из строк, расхождение имён с контрактом и нормализация телефона для БД.
 * Ни одно поле здесь не описывается заново — иначе клиент и сервер разойдутся
 * на первой же правке формы.
 */

/** Тема заявки, когда форма её не спрашивает: человек оставил только имя и телефон. */
export const DEFAULT_LEAD_TOPIC = 'Консультация';

/** Тема заявки на сезонное обслуживание — форма напоминания о ТО темы не спрашивает. */
export const TO_REMINDER_TOPIC = 'ТО и чистка';

/**
 * Форма отдаёт пустые строки за незаполненные поля: браузер шлёт все input,
 * даже нетронутые. Для схемы это разные вещи — «поле пустое» и «поля нет», —
 * поэтому пустые значения убираем до разбора, чтобы `optional()` работал,
 * а в базу попадал `null`, а не пустая строка.
 */
export function compactFormFields(
  fields: Readonly<Record<string, string>>,
): Record<string, string> {
  const compacted: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value !== '') compacted[key] = value;
  }
  return compacted;
}

/**
 * Телефон в базе — ключ, по которому владелец узнаёт повторное обращение,
 * поэтому он приводится к единому виду. Функция ничего не отвергает:
 * достаточность цифр проверяет `phoneSchema` сущности, а здесь номер, уже
 * прошедший проверку, только причёсывается.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('8')) return `+7${digits.slice(1)}`;
  if (digits.length === 10) return `+7${digits}`;
  return `+${digits}`;
}

/**
 * Заявка. Из схемы сущности убраны поля происхождения: `sourceUrl`,
 * `referrer` и `utm` не приходят от человека — сервер собирает их сам из
 * заголовков и адреса страницы-источника (`intake/tracking.ts`), а в теле
 * формы `utm` был бы строкой, а не объектом.
 */
export const leadFormSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;

    const raw: Record<string, unknown> = { ...value };
    // Контракт (docs/API.md §8) называет поле времени звонка `time`, схема
    // сущности — `callTime`. Принимаем оба имени, чтобы форма могла прислать любое.
    if (raw.callTime === undefined && raw.time !== undefined) raw.callTime = raw.time;
    delete raw.time;
    return raw;
  },
  leadInputSchema.omit({ sourceUrl: true, referrer: true, utm: true }),
);

export const toReminderFormSchema = toReminderSchema;

export const reviewFormSchema = reviewInputSchema;

export type LeadFormInput = z.infer<typeof leadFormSchema>;
export type ToReminderFormInput = z.infer<typeof toReminderFormSchema>;
export type ReviewFormInput = z.infer<typeof reviewFormSchema>;
