import { z } from 'zod';

/**
 * Разбор ответов публичного API на клиенте — docs/API.md §11.
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
