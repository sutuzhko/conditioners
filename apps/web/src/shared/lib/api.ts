import { z } from 'zod';

/**
 * Разбор ответов публичного API на клиенте — docs/API.md §14.
 *
 * Ответ сервера приходит снаружи, значит проходит через схему, а не через
 * приведение типа. Формы заявки и отзыва описывали конверт ошибки одинаково и
 * по отдельности: правило слоёв запрещает импорт вбок между фичами, и общая
 * деталь размножилась (ADR-030). Место у неё здесь.
 *
 * Схема повторяет то, что реально отдаёт `server/http.ts`: `field` появляется
 * только у ошибки валидации, поэтому он необязателен.
 */
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    /** Текст для человека: он по-русски и объясняет, что делать дальше. */
    message: z.string(),
    field: z.string().optional(),
  }),
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorSchema>;

/**
 * Успешный `201` публичных POST (`/api/leads`, `/api/reviews`): сервер отдаёт
 * только идентификатор созданной записи — по нему владелец находит обращение.
 */
export const createdSchema = z.object({ id: z.string().min(1) });

export type Created = z.infer<typeof createdSchema>;

/**
 * Общий запрос админских фич к API панели.
 *
 * До него девять фич держали свои копии fetch-обёртки на каскадах приведений,
 * и обработка 401 успела разойтись: шесть из девяти показывали владельцу
 * «сервер не принял изменения» вместо «войдите заново» (аудит, BUGS; ADR-030
 * предписывал общую деталь с самого начала). Ответ сервера — внешние данные,
 * поэтому конверт ошибки разбирается схемой, а не приведением типа.
 */
export type AdminRequestResult =
  | { readonly ok: true; readonly payload: unknown }
  | {
      readonly ok: false;
      readonly message: string;
      /** Поле формы из ошибки валидации — если сервер его назвал. */
      readonly field?: string;
      /** 401: чинить нужно не форму, а сессию — войти заново. */
      readonly unauthorized?: boolean;
    };

export type AdminRequestTexts = {
  /** Сеть недоступна или запрос оборвался. */
  readonly network: string;
  /** Сервер ответил отказом без внятного текста. */
  readonly server: string;
  /** 401 — сессия истекла. */
  readonly session: string;
};

export async function adminRequest(
  url: string,
  init: RequestInit,
  texts: AdminRequestTexts,
): Promise<AdminRequestResult> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    return { ok: false, message: texts.network };
  }

  if (response.status === 401) {
    return { ok: false, message: texts.session, unauthorized: true };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (response.ok) return { ok: true, payload };

  const parsed = apiErrorSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: texts.server };

  const { message, field } = parsed.data.error;
  return { ok: false, message, ...(field === undefined || field === '' ? {} : { field }) };
}

/** JSON-запрос: заголовок и сериализация тела в одном месте. */
export function jsonInit(method: string, body?: unknown): RequestInit {
  return {
    method,
    ...(body === undefined
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  };
}
