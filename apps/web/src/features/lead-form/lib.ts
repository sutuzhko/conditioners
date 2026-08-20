import { leadFormContent } from './content';
import {
  apiErrorSchema,
  leadCreatedSchema,
  leadFormSchema,
  LEAD_FIELD_ORDER,
  type LeadFieldErrors,
  type LeadFormValues,
  type LeadSubmitResult,
} from './model';

/** Адрес приёма заявки — docs/API.md §8. */
export const LEAD_ENDPOINT = '/api/leads';

/** Поле-ловушка. Имя совпадает с тем, что ждёт сервер (`server/intake/body.ts`). */
export const HONEYPOT_FIELD = 'hp';

/** Необязательные текстовые поля: пустые значения до схемы не доходят. */
const OPTIONAL_FIELDS = ['topic', 'place', 'qty', 'callTime', 'address', 'comment'] as const;

export function emptyLeadValues(topic: string): LeadFormValues {
  return {
    name: '',
    phone: '',
    topic,
    place: '',
    qty: '',
    callTime: '',
    address: '',
    comment: '',
    consent: false,
  };
}

/**
 * Незаполненное поле и поле, которого нет, — для схемы разные вещи: `optional()`
 * не срабатывает на пустой строке. Убираем пустые значения до разбора, ровно как
 * это делает сервер перед своей проверкой.
 */
function toPayload(values: LeadFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: values.name,
    phone: values.phone,
    consent: values.consent,
  };

  for (const key of OPTIONAL_FIELDS) {
    const value = values[key].trim();
    if (value !== '') payload[key] = value;
  }

  return payload;
}

/**
 * Проверка перед отправкой — схемой сущности, не своими правилами.
 * Возвращает первую ошибку каждого поля: список из десяти замечаний человек
 * не читает, а под полем помещается одно.
 */
export function validateLeadValues(values: LeadFormValues): LeadFieldErrors | null {
  const result = leadFormSchema.safeParse(toPayload(values));
  if (result.success) return null;

  const byField = new Map<string, string>();
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string' || byField.has(field)) continue;
    byField.set(field, issue.message);
  }

  // Раскладываем по известным полям: у поля-ловушки видимой строки нет, и её
  // сообщение не должно попасть в интерфейс.
  const errors: LeadFieldErrors = {};
  for (const key of LEAD_FIELD_ORDER) {
    const message = byField.get(key);
    if (message !== undefined) errors[key] = message;
  }

  return errors;
}

/**
 * Тело запроса. `multipart/form-data` собирается браузером сам — заголовок
 * с границей частей выставлять руками нельзя, иначе сервер не разберёт файл.
 */
export function buildLeadFormData(
  values: LeadFormValues,
  photo: File | null,
  honeypot: string,
): FormData {
  const data = new FormData();
  data.append('name', values.name.trim());
  data.append('phone', values.phone.trim());

  for (const key of OPTIONAL_FIELDS) {
    const value = values[key].trim();
    if (value !== '') data.append(key, value);
  }

  if (photo !== null) data.append('photo', photo);
  // 🔴 согласие уходит явным полем: сервер пишет его время в `Lead.consentAt` (152-ФЗ)
  data.append('consent', String(values.consent));
  data.append(HONEYPOT_FIELD, honeypot);

  return data;
}

/** Ответ без понятного текста — подставляем свой, по коду состояния. */
function fallbackMessage(status: number): string {
  if (status === 429) return leadFormContent.errorRateLimited;
  if (status === 413) return leadFormContent.errorTooLarge;
  return leadFormContent.errorUnknown;
}

/**
 * Отправка заявки. Ошибка сети — тоже результат, а не исключение: форма обязана
 * показать человеку, что делать дальше, а не упасть без объяснений.
 */
export async function postLead(
  data: FormData,
  endpoint = LEAD_ENDPOINT,
): Promise<LeadSubmitResult> {
  let response: Response;

  try {
    response = await fetch(endpoint, { method: 'POST', body: data });
  } catch {
    return { ok: false, message: leadFormContent.errorNetwork };
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (response.status === 201) {
    const created = leadCreatedSchema.safeParse(payload);
    // заявка уже в базе; отсутствие `id` в теле — повод для лога, а не для тревоги
    return { ok: true, id: created.success ? created.data.id : '' };
  }

  const envelope = apiErrorSchema.safeParse(payload);
  if (!envelope.success) return { ok: false, message: fallbackMessage(response.status) };

  return { ok: false, message: envelope.data.error.message, field: envelope.data.error.field };
}
