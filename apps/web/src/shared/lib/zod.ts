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
 * Телефон: принимается в любом виде, лишь бы цифр хватало на российский номер.
 *
 * Мягкость намеренная. Человек в июльскую жару набирает номер как привык — со
 * скобками, с восьмёркой, через пробелы, — и терять из-за формата заявку или
 * карточку клиента нельзя: к единому виду номер приводит `shared/lib/phone`.
 *
 * Текст «поле обязательно» задаётся вызывающим: в публичной форме это «по
 * нему мы перезвоним», в карточке клиента — про клиента. Остальные правила у
 * всех одни, и второй их копии быть не должно.
 */
export function phoneField(required: string): z.ZodEffects<z.ZodString, string, string> {
  return z
    .string({ required_error: required, invalid_type_error: required })
    .trim()
    .min(1, { message: required })
    .refine((value) => value.replace(/\D/g, '').length >= 10, {
      message: 'Похоже, в номере не хватает цифр',
    });
}

/**
 * Необязательный телефон: второй номер в наряде, номер в карточке дела, номер
 * монтажника.
 *
 * 🔴 Правило то же, что у обязательного: пустое поле — это «не заполнено», а
 * заполненное обязано быть номером. В панели номер — не подпись, а кнопка
 * «позвонить»: строка «asdf» доезжает до `tel:` и обнаруживается в тот
 * момент, когда по ней пытаются дозвониться.
 *
 * Ограничение длины остаётся: колонка в базе не резиновая, а сорок символов
 * хватает и на «+7 (900) 000-11-22 доб. 105».
 */
export function optionalPhoneField(
  max = 40,
): z.ZodDefault<z.ZodEffects<z.ZodNullable<z.ZodString>, string | null, string | null>> {
  return z
    .string()
    .trim()
    .max(max, { message: `Не длиннее ${max} символов` })
    .nullable()
    .transform((value, ctx) => {
      if (value === null || value === '') return null;

      if (value.replace(/\D/g, '').length < 10) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Похоже, в номере не хватает цифр',
        });
        return z.NEVER;
      }

      return value;
    })
    .default(null);
}

/**
 * Honeypot: поле скрыто от человека, но видно роботу. Любое заполнение —
 * признак бота.
 */
export const honeypotSchema = z.string().max(0, { message: 'Заявка отклонена' }).optional();

/** Дата без времени: так её отдаёт `<input type="date">` в админке. */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 🔴 Бизнес в Туле, поэтому календарная дата превращается в мгновение по
 * московскому времени: «до 31 октября» обязано заканчиваться в полночь по
 * Туле, а не в три часа ночи первого ноября. Пояс фиксированный — переходов
 * на летнее время в России нет, — значит расчёт остаётся детерминированным.
 */
const MSK_OFFSET = '+03:00';

/**
 * Граница периода из формы: `start` — начало дня, `end` — его последняя
 * миллисекунда. Пустая строка означает «границы нет», а не «дата неверна»:
 * браузер шлёт незаполненное поле пустым.
 */
export function moscowDate(
  boundary: 'start' | 'end' = 'start',
): z.ZodEffects<z.ZodNullable<z.ZodString>, Date | null, string | null> {
  const time = boundary === 'end' ? '23:59:59.999' : '00:00:00.000';

  return z
    .string({ invalid_type_error: 'Дата указана в неизвестном формате' })
    .trim()
    .nullable()
    .transform((value, ctx) => {
      if (value === null || value === '') return null;

      const parsed = DATE_ONLY.test(value)
        ? new Date(`${value}T${time}${MSK_OFFSET}`)
        : new Date(value);

      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Дата указана в неизвестном формате',
        });
        return z.NEVER;
      }

      return parsed;
    });
}
