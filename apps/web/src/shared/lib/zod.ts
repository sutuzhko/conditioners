import { z } from 'zod';

/**
 * Мелкие схемы, общие для публичных форм.
 *
 * Формы уходят как `multipart/form-data`, поэтому в теле запроса всё —
 * строки: чекбокс приходит как `on`, а не `true`. Приведение живёт в одном
 * месте, чтобы каждый обработчик не изобретал своё.
 */

const TRUTHY = new Set(['true', 'on', '1', 'yes']);

function toConsent(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return TRUTHY.has(value.toLowerCase());
  // Неотмеченный чекбокс браузер не отправляет вовсе — это тоже отказ,
  // и человек должен увидеть про согласие, а не «Invalid input» от Zod.
  return false;
}

/**
 * Согласие на обработку персональных данных. Обязательно: без него форма не
 * отправляется, а факт согласия пишется в БД (152-ФЗ, инвариант 12).
 */
export const consentSchema = z
  .preprocess(toConsent, z.boolean())
  .refine((value) => value, { message: 'Без согласия на обработку данных отправка невозможна' });

/**
 * Honeypot: поле скрыто от человека, но видно роботу. Любое заполнение —
 * признак бота.
 */
export const honeypotSchema = z.string().max(0, { message: 'Заявка отклонена' }).optional();
