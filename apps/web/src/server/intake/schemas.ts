import { z } from 'zod';

/**
 * Схемы публичных форм. Клиентская валидация — это UX, защита живёт здесь
 * (docs/CLAUDE.md, раздел «Формы и состояния»).
 *
 * Тексты ошибок уходят пользователю как есть, поэтому они по-русски и говорят,
 * что именно поправить.
 */

/** Тема заявки, когда форма её не спрашивает: человек оставил только имя и телефон. */
export const DEFAULT_LEAD_TOPIC = 'Консультация';

/** Тема заявки на сезонное обслуживание — форма напоминания о ТО темы не спрашивает. */
export const TO_REMINDER_TOPIC = 'ТО и чистка';

const NAME_MESSAGE = 'Укажите, как к вам обращаться — не короче двух букв.';
const PHONE_MESSAGE = 'Укажите телефон в формате +7 900 000-00-00 — по нему мы перезвоним.';
const CONSENT_MESSAGE =
  'Отметьте согласие на обработку персональных данных — без него мы не вправе принять обращение.';
const RATING_MESSAGE = 'Поставьте оценку от 1 до 5 звёзд.';
const TEXT_MESSAGE = 'Расскажите о работе подробнее — не меньше 10 символов.';

const TRUE_VALUES: ReadonlySet<string> = new Set(['on', 'true', '1', 'yes', 'да']);

/**
 * Телефон приводится к единому виду: в базе он ключ для поиска повторных
 * обращений, а «+7 (900) 000-00-00» и «8 900 0000000» — один и тот же номер.
 */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11 && (digits.startsWith('7') || digits.startsWith('8'))) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 10) return `+7${digits}`;
  return null;
}

const phoneField = z.preprocess(
  (value) => (typeof value === 'string' ? normalizePhone(value) : value),
  z.string({ required_error: PHONE_MESSAGE, invalid_type_error: PHONE_MESSAGE }),
);

const consentField = z
  .preprocess((value) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return TRUE_VALUES.has(value.toLowerCase());
    return false;
  }, z.boolean())
  .refine((value) => value, { message: CONSENT_MESSAGE });

function requiredText(min: number, max: number, message: string): z.ZodString {
  return z
    .string({ required_error: message, invalid_type_error: message })
    .trim()
    .min(min, message)
    .max(max, `Слишком длинный текст: уместите в ${max} символов.`);
}

function optionalText(max: number): z.ZodType<string | undefined, z.ZodTypeDef, unknown> {
  return z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max, `Слишком длинный текст: уместите в ${max} символов.`).optional(),
  );
}

export const leadSchema = z.object({
  name: requiredText(2, 100, NAME_MESSAGE),
  phone: phoneField,
  topic: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(60).default(DEFAULT_LEAD_TOPIC),
  ),
  place: optionalText(80),
  qty: optionalText(40),
  time: optionalText(80),
  address: optionalText(200),
  comment: optionalText(2000),
  consent: consentField,
});

export const toReminderSchema = z.object({
  phone: phoneField,
  when: optionalText(120),
  consent: consentField,
});

export const reviewSchema = z.object({
  name: requiredText(2, 100, NAME_MESSAGE),
  district: optionalText(80),
  rating: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() !== '' ? Number(value) : value),
    z
      .number({ required_error: RATING_MESSAGE, invalid_type_error: RATING_MESSAGE })
      .int(RATING_MESSAGE)
      .min(1, RATING_MESSAGE)
      .max(5, RATING_MESSAGE),
  ),
  text: requiredText(10, 4000, TEXT_MESSAGE),
  consent: consentField,
});

export type LeadInput = z.infer<typeof leadSchema>;
export type ToReminderInput = z.infer<typeof toReminderSchema>;
export type ReviewInput = z.infer<typeof reviewSchema>;
