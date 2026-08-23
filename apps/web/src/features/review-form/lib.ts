import { apiErrorSchema, createdSchema } from '@/shared/lib/api';

import { reviewFormContent } from './content';
import {
  RATING_UNSET,
  REVIEW_FIELD_ORDER,
  reviewFormSchema,
  type ReviewFieldErrors,
  type ReviewFormValues,
  type ReviewSubmitResult,
} from './model';

/** Адрес приёма отзыва — docs/API.md §7. */
export const REVIEW_ENDPOINT = '/api/reviews';

/** Поле-ловушка. Имя совпадает с тем, что ждёт сервер (`server/intake/body.ts`). */
export const HONEYPOT_FIELD = 'hp';

export function emptyReviewValues(): ReviewFormValues {
  return { name: '', rating: RATING_UNSET, text: '', consent: false };
}

/** Значения формы в вид, который понимает схема сущности. */
function toPayload(values: ReviewFormValues): Record<string, unknown> {
  return {
    name: values.name,
    rating: values.rating,
    text: values.text,
    consent: values.consent,
  };
}

/**
 * Проверка перед отправкой — схемой сущности, не своими правилами.
 * Возвращает первую ошибку каждого поля: список замечаний человек не читает,
 * а под полем помещается одно.
 */
export function validateReviewValues(values: ReviewFormValues): ReviewFieldErrors | null {
  const result = reviewFormSchema.safeParse(toPayload(values));
  if (result.success) return null;

  const byField = new Map<string, string>();
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field !== 'string' || byField.has(field)) continue;
    byField.set(field, issue.message);
  }

  // Раскладываем по известным полям: у поля-ловушки видимой строки нет, и её
  // сообщение не должно попасть в интерфейс.
  const errors: ReviewFieldErrors = {};
  for (const key of REVIEW_FIELD_ORDER) {
    const message = byField.get(key);
    if (message !== undefined) errors[key] = message;
  }

  return errors;
}

/**
 * Тело запроса. `multipart/form-data` собирается браузером сам — заголовок
 * с границей частей выставлять руками нельзя, иначе сервер не разберёт файл.
 */
export function buildReviewFormData(
  values: ReviewFormValues,
  photos: { readonly place: File | null; readonly author: File | null },
  honeypot: string,
): FormData {
  const data = new FormData();
  data.append('name', values.name.trim());
  data.append('rating', String(values.rating));
  data.append('text', values.text.trim());

  // два снимка приходят раздельно: место установки и сам автор
  if (photos.place !== null) data.append('photo', photos.place);
  if (photos.author !== null) data.append('avatar', photos.author);
  // 🔴 согласие уходит явным полем: сервер пишет его время в `Review.consentAt` (152-ФЗ)
  data.append('consent', String(values.consent));
  data.append(HONEYPOT_FIELD, honeypot);

  return data;
}

/** Ответ без понятного текста — подставляем свой, по коду состояния. */
function fallbackMessage(status: number): string {
  if (status === 429) return reviewFormContent.errorRateLimited;
  if (status === 413) return reviewFormContent.errorTooLarge;
  return reviewFormContent.errorUnknown;
}

/**
 * Отправка отзыва. Ошибка сети — тоже результат, а не исключение: форма обязана
 * показать человеку, что делать дальше, а не упасть без объяснений.
 */
export async function postReview(
  data: FormData,
  endpoint = REVIEW_ENDPOINT,
): Promise<ReviewSubmitResult> {
  let response: Response;

  try {
    response = await fetch(endpoint, { method: 'POST', body: data });
  } catch {
    return { ok: false, message: reviewFormContent.errorNetwork };
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (response.status === 201) {
    const created = createdSchema.safeParse(payload);
    // отзыв уже в базе; отсутствие `id` в теле — повод для лога, а не для тревоги
    return { ok: true, id: created.success ? created.data.id : '' };
  }

  const envelope = apiErrorSchema.safeParse(payload);
  if (!envelope.success) return { ok: false, message: fallbackMessage(response.status) };

  return { ok: false, message: envelope.data.error.message, field: envelope.data.error.field };
}
