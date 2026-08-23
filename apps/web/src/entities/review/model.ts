import { z } from 'zod';

import { consentSchema, honeypotSchema } from '@/shared/lib/zod';

/**
 * Отзыв. Приходит с сайта со статусом `pending`.
 *
 * 🔴 Текст неизменяем: модератор меняет только статус (инвариант 7). Поэтому
 * схемы правки текста здесь нет и быть не может.
 */
export const reviewStatusSchema = z.enum(['pending', 'approved', 'rejected', 'archived']);

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

/**
 * Модератор переводит отзыв в один из трёх конечных статусов.
 *
 * 🔴 Схема строгая и ровно с одним полем: попытка прислать `text`, `name` или
 * `rating` заканчивается 400, а не молчаливым игнорированием. Редактируемый
 * отзыв — не отзыв (инвариант 7).
 */
export const reviewModerationSchema = z
  .object({
    /* 🔴 `pending` в списке намеренно: модератор должен уметь вернуть отзыв
       в очередь — например, когда ошибся кнопкой или решил перечитать. Без
       этого одобренный отзыв нельзя было снять с публикации иначе, чем
       отклонить, а это разные вещи. */
    status: z.enum(['pending', 'approved', 'rejected', 'archived'], {
      errorMap: () => ({ message: 'Неизвестный статус отзыва' }),
    }),
  })
  .strict();

export type ReviewModeration = z.infer<typeof reviewModerationSchema>;

export const RATING_MIN = 1;
export const RATING_MAX = 5;
/** Осмысленный отзыв короче этого не бывает — короткие оставляют спам-боты. */
export const REVIEW_TEXT_MIN = 10;

/** Оценка приходит из формы строкой, а её отсутствие и «abc» для человека — одна и та же ошибка. */
const RATING_MESSAGE = `Поставьте оценку от ${RATING_MIN} до ${RATING_MAX} звёзд`;
const NAME_REQUIRED = 'Как вас зовут? Не короче двух букв';
const TEXT_REQUIRED = `Расскажите о работе подробнее — не меньше ${REVIEW_TEXT_MIN} символов`;

export const reviewSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  rating: z.number().int().min(RATING_MIN).max(RATING_MAX),
  text: z.string().trim().min(REVIEW_TEXT_MIN),
  /** Место установки: по нему видно и аккуратность бригады, и мусор. */
  photo: z.string().nullable().default(null),
  /** Автор отзыва. */
  avatar: z.string().nullable().default(null),
  status: reviewStatusSchema.default('pending'),
  createdAt: z.coerce.date(),
});

export type Review = z.infer<typeof reviewSchema>;

/**
 * Публичная форма отзыва. Согласие на обработку персональных данных
 * обязательно и проверяется на сервере той же схемой (152-ФЗ, инвариант 12);
 * `hp` — honeypot, заполненное поле означает бота.
 */
export const reviewInputSchema = z.object({
  name: z
    .string({ required_error: NAME_REQUIRED, invalid_type_error: NAME_REQUIRED })
    .trim()
    .min(2, { message: NAME_REQUIRED })
    .max(80, { message: 'Имя длиннее 80 символов не поместится' }),
  rating: z.coerce
    .number({ required_error: RATING_MESSAGE, invalid_type_error: RATING_MESSAGE })
    .int(RATING_MESSAGE)
    .min(RATING_MIN, RATING_MESSAGE)
    .max(RATING_MAX, RATING_MESSAGE),
  text: z
    .string({ required_error: TEXT_REQUIRED, invalid_type_error: TEXT_REQUIRED })
    .trim()
    .min(REVIEW_TEXT_MIN, { message: TEXT_REQUIRED })
    .max(4000, { message: 'Отзыв длиннее 4000 символов не поместится' }),
  consent: consentSchema,
  hp: honeypotSchema,
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
