import { z } from 'zod';

/**
 * Мелкие схемы, общие для публичных форм.
 *
 * Формы уходят как `multipart/form-data`, поэтому в теле запроса всё —
 * строки: чекбокс приходит как `on`, а не `true`. Приведение живёт в одном
 * месте, чтобы каждый обработчик не изобретал своё.
 */

const TRUTHY = new Set(['true', 'on', '1', 'yes']);

/**
 * Согласие на обработку персональных данных. Обязательно: без него форма не
 * отправляется, а факт согласия пишется в БД (152-ФЗ, инвариант 12).
 */
export const consentSchema = z
  .union([z.boolean(), z.string()])
  .transform((value) => (typeof value === 'boolean' ? value : TRUTHY.has(value.toLowerCase())))
  .refine((value) => value, { message: 'Без согласия на обработку данных отправка невозможна' });

/**
 * Honeypot: поле скрыто от человека, но видно роботу. Любое заполнение —
 * признак бота.
 */
export const honeypotSchema = z.string().max(0, { message: 'Заявка отклонена' }).optional();
