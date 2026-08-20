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

/** Модератор переводит отзыв в один из трёх конечных статусов. */
export const reviewModerationSchema = z.object({
  status: z.enum(['approved', 'rejected', 'archived']),
});

export type ReviewModeration = z.infer<typeof reviewModerationSchema>;

export const RATING_MIN = 1;
export const RATING_MAX = 5;
/** Осмысленный отзыв короче этого не бывает — короткие оставляют спам-боты. */
export const REVIEW_TEXT_MIN = 10;

export const reviewSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  district: z.string().nullable().default(null),
  rating: z.number().int().min(RATING_MIN).max(RATING_MAX),
  text: z.string().trim().min(REVIEW_TEXT_MIN),
  photo: z.string().nullable().default(null),
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
  name: z.string().trim().min(2).max(80),
  district: z.string().trim().max(120).optional(),
  rating: z.coerce.number().int().min(RATING_MIN).max(RATING_MAX),
  text: z.string().trim().min(REVIEW_TEXT_MIN).max(4000),
  consent: consentSchema,
  hp: honeypotSchema,
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
