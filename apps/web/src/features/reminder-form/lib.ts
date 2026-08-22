import { apiErrorSchema, createdSchema } from '@/shared/lib/api';

import { reminderFormContent } from './content';
import {
  REMINDER_FIELD_ORDER,
  reminderFormSchema,
  type ReminderFieldErrors,
  type ReminderFormValues,
  type ReminderSubmitResult,
} from './model';

/** Адрес приёма напоминания — docs/API.md §8. */
export const REMINDER_ENDPOINT = '/api/leads/to-reminder';

/** Поле-ловушка. Имя совпадает с тем, что ждёт сервер (`server/intake/body.ts`). */
export const HONEYPOT_FIELD = 'hp';

export function emptyReminderValues(when: string): ReminderFormValues {
  return { phone: '', when, consent: false };
}

/**
 * Тело для проверки. Пустой срок и невыбранный срок — для схемы разное:
 * `optional()` не срабатывает на пустой строке. Убираем пустое значение до
 * разбора, ровно как это делает сервер перед своей проверкой.
 */
function toPayload(values: ReminderFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    phone: values.phone,
    consent: values.consent,
  };

  const when = values.when.trim();
  if (when !== '') payload.when = when;

  return payload;
}

/**
 * Проверка перед отправкой — схемой сущности, не своими правилами.
 * Возвращает первую ошибку каждого поля: список замечаний человек не читает,
 * а под полем помещается одно.
 */
export function validateReminderValues(values: ReminderFormValues): ReminderFieldErrors | null {
  const result = reminderFormSchema.safeParse(toPayload(values));
  if (result.success) return null;

  const byField = new Map<string, string>();
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string' || byField.has(field)) continue;
    byField.set(field, issue.message);
  }

  // Раскладываем по известным полям: у поля-ловушки видимой строки нет, и её
  // сообщение не должно попасть в интерфейс.
  const errors: ReminderFieldErrors = {};
  for (const key of REMINDER_FIELD_ORDER) {
    const message = byField.get(key);
    if (message !== undefined) errors[key] = message;
  }

  return errors;
}

/**
 * Тело запроса. Форма без файла, но сервер принимает её тем же разбором
 * `multipart/form-data`, что и остальные обращения, — отправляем `FormData`.
 */
export function buildReminderFormData(values: ReminderFormValues, honeypot: string): FormData {
  const data = new FormData();
  data.append('phone', values.phone.trim());

  const when = values.when.trim();
  if (when !== '') data.append('when', when);

  // 🔴 согласие уходит явным полем: сервер пишет его время в `Lead.consentAt` (152-ФЗ)
  data.append('consent', String(values.consent));
  data.append(HONEYPOT_FIELD, honeypot);

  return data;
}

/** Ответ без понятного текста — подставляем свой, по коду состояния. */
function fallbackMessage(status: number): string {
  if (status === 429) return reminderFormContent.errorRateLimited;
  return reminderFormContent.errorUnknown;
}

/**
 * Отправка напоминания. Ошибка сети — тоже результат, а не исключение: форма
 * обязана показать человеку, что делать дальше, а не упасть без объяснений.
 */
export async function postReminder(
  data: FormData,
  endpoint = REMINDER_ENDPOINT,
): Promise<ReminderSubmitResult> {
  let response: Response;

  try {
    response = await fetch(endpoint, { method: 'POST', body: data });
  } catch {
    return { ok: false, message: reminderFormContent.errorNetwork };
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (response.status === 201) {
    const created = createdSchema.safeParse(payload);
    // запись уже в базе; отсутствие `id` в теле — повод для лога, а не для тревоги
    return { ok: true, id: created.success ? created.data.id : '' };
  }

  const envelope = apiErrorSchema.safeParse(payload);
  if (!envelope.success) return { ok: false, message: fallbackMessage(response.status) };

  return { ok: false, message: envelope.data.error.message, field: envelope.data.error.field };
}
