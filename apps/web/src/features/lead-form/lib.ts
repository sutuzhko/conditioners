import { leadContextModelText, leadContextPickText } from '@/entities/lead/lib/context';
import type { LeadContext } from '@/entities/lead/model';
import { leadTopicByKey } from '@/shared/config/lead';
import { apiErrorSchema, createdSchema } from '@/shared/lib/api';
import { formatMoney } from '@/shared/lib/format';

import { leadFormContent } from './content';
import {
  leadFormSchema,
  LEAD_FIELD_ORDER,
  type LeadFieldErrors,
  type LeadFormValues,
  type LeadModelOption,
  type LeadSubmitResult,
} from './model';
import type { LeadSubjectParams } from './subject';

/** Адрес приёма заявки — docs/API.md §8. */
export const LEAD_ENDPOINT = '/api/leads';

/** Поле-ловушка. Имя совпадает с тем, что ждёт сервер (`server/intake/body.ts`). */
export const HONEYPOT_FIELD = 'hp';

/** Поле контекста: снимок действий человека одной JSON-строкой (docs/API.md §8). */
export const CONTEXT_FIELD = 'context';

/** Необязательные текстовые поля: пустые значения до схемы не доходят. */
const OPTIONAL_FIELDS = [
  'topic',
  'model',
  'place',
  'qty',
  'callTime',
  'address',
  'comment',
] as const;

export function emptyLeadValues(topic: string): LeadFormValues {
  return {
    name: '',
    phone: '',
    topic,
    model: '',
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
  context: LeadContext | null = null,
): FormData {
  const data = new FormData();
  data.append('name', values.name.trim());
  data.append('phone', values.phone.trim());

  for (const key of OPTIONAL_FIELDS) {
    const value = values[key].trim();
    if (value !== '') data.append(key, value);
  }

  if (photo !== null) data.append('photo', photo);
  /* Контекст уходит JSON-строкой: `multipart/form-data` знает только строки и
     файлы, а разбирать его всё равно серверной схеме — доверия к телу формы
     не больше, чем к любому другому полю. */
  if (context !== null) data.append(CONTEXT_FIELD, JSON.stringify(context));
  // 🔴 согласие уходит явным полем: сервер пишет его время в `Lead.consentAt` (152-ФЗ)
  data.append('consent', String(values.consent));
  data.append(HONEYPOT_FIELD, honeypot);

  return data;
}

/**
 * Предмет из адреса ложится в поля формы (ADR-129).
 *
 * 🔴 Подстановка — подсказка, а не замок: функция чистая и вызывается только
 * при смене предмета, поэтому правку человека она не затирает. Параметр,
 * которого в адресе нет, поля не трогает: кнопка без модели не должна стирать
 * то, что человек уже написал сам.
 *
 * Неизвестный слаг молча даёт пустое поле, неизвестный ключ темы — тему по
 * умолчанию: адрес правят руками и присылают друг другу, и опечатка в нём —
 * повод открыть обычную форму, а не показать отказ.
 */
export function applyLeadSubject(
  values: LeadFormValues,
  subject: LeadSubjectParams,
  models: readonly LeadModelOption[],
  defaultTopic: string,
): LeadFormValues {
  const model =
    subject.model === undefined
      ? values.model
      : (models.find((option) => option.slug === subject.model)?.name ?? '');

  const topic =
    subject.topic === undefined ? values.topic : (leadTopicByKey(subject.topic) ?? defaultTopic);

  return { ...values, model, topic };
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
    const created = createdSchema.safeParse(payload);
    // заявка уже в базе; отсутствие `id` в теле — повод для лога, а не для тревоги
    return { ok: true, id: created.success ? created.data.id : '' };
  }

  const envelope = apiErrorSchema.safeParse(payload);
  if (!envelope.success) return { ok: false, message: fallbackMessage(response.status) };

  return { ok: false, message: envelope.data.error.message, field: envelope.data.error.field };
}

/** Строка списка «к заявке приложено»: что это и что именно приложено. */
export type LeadContextEntry = { readonly label: string; readonly value: string };

/**
 * Что человек увидит в форме перед отправкой.
 *
 * 🔴 Прикреплённое показывается, а не собирается тайком: человек вправе знать,
 * что уедет вместе с его телефоном, и вправе это снять. Персональных данных в
 * контексте нет, но незаметный сбор — плохая привычка независимо от 152-ФЗ.
 */
export function describeLeadContext(context: LeadContext | null): readonly LeadContextEntry[] {
  if (context === null) return [];

  const entries: LeadContextEntry[] = [];

  if (context.estimate !== null) {
    entries.push({
      label: leadFormContent.contextEstimate,
      value: formatMoney(context.estimate.total),
    });
  }

  if (context.pick !== null) {
    const picked = context.pick.model;
    entries.push({
      label: leadFormContent.contextPick,
      value:
        picked === null
          ? leadContextPickText(context.pick)
          : `${leadContextPickText(context.pick)} → ${leadContextModelText(picked)}`,
    });
  }

  if (context.model !== null) {
    entries.push({
      label: leadFormContent.contextModel,
      value: leadContextModelText(context.model),
    });
  }

  if (context.liked.length > 0) {
    entries.push({
      label: leadFormContent.contextLiked,
      value: context.liked.map(leadContextModelText).join(', '),
    });
  }

  return entries;
}
