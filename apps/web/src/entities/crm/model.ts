import { z } from 'zod';

import { parseDayKey } from '@/shared/lib/calendar';
import { optionalPhoneField } from '@/shared/lib/zod';

/**
 * Дело в календаре: звонок, замер, монтаж, обслуживание.
 *
 * Календарь заводится не ради красоты — заявка отвечает только на вопрос
 * «кто обратился». Когда выехать, кому перезвонить в четверг и что обещали
 * клиенту, до сих пор жило в голове владельца и в переписке.
 */
export const crmEventKindSchema = z.enum([
  'call',
  'measure',
  'install',
  'service',
  'meeting',
  'note',
]);

export type CrmEventKind = z.infer<typeof crmEventKindSchema>;

export const CRM_EVENT_KINDS: readonly CrmEventKind[] = crmEventKindSchema.options;

/** Значение из `select` — строка. Принять её за вид дела без проверки нельзя. */
export function isCrmEventKind(value: string): value is CrmEventKind {
  return CRM_EVENT_KINDS.some((kind) => kind === value);
}

export const crmEventStatusSchema = z.enum(['planned', 'done', 'cancelled']);

export type CrmEventStatus = z.infer<typeof crmEventStatusSchema>;

export const CRM_EVENT_STATUSES: readonly CrmEventStatus[] = crmEventStatusSchema.options;

const NAME_REQUIRED = 'Укажите, с кем встреча или разговор';

/**
 * Дата и время приходят двумя полями, а не одним `datetime-local`: на телефоне
 * это два привычных выбора вместо одного неудобного, а на десктопе время
 * набирается с клавиатуры, не открывая календарь.
 */
const daySchema = z
  .string({ required_error: 'Выберите дату' })
  .trim()
  .refine((value) => parseDayKey(value) !== null, { message: 'Такой даты не существует' });

const timeSchema = z
  .string({ required_error: 'Укажите время' })
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Время указывается как 14:30' });

/** Пустое необязательное поле формы приходит пустой строкой — это «не заполнено». */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Не длиннее ${max} символов` })
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .default(null);

export const crmEventCreateSchema = z.object({
  kind: crmEventKindSchema,
  day: daySchema,
  time: timeSchema,
  clientName: z
    .string({ required_error: NAME_REQUIRED })
    .trim()
    .min(1, { message: NAME_REQUIRED })
    .max(120, { message: 'Не длиннее 120 символов' }),
  /**
   * Сколько дело занимает. Без длительности его нечем нарисовать на часовой
   * сетке: «занято с 11 до 20» — это отрезок, а не точка (ADR-128).
   *
   * Шаг в пятнадцать минут — тот же, что у наряда: полчаса на звонок и
   * полтора часа на замер одинаково обычны.
   */
  durationMin: z.coerce
    .number()
    .int({ message: 'Длительность — целое число минут' })
    .min(15, { message: 'Не меньше пятнадцати минут' })
    .max(24 * 60, { message: 'Дело не длиннее суток' })
    .refine((value) => value % 15 === 0, { message: 'Шаг — пятнадцать минут' })
    .default(60),
  /* Номер по общему правилу проекта: в календаре он — кнопка «позвонить». */
  clientPhone: optionalPhoneField(40),
  address: optionalText(200),
  note: optionalText(2000),
  /** Заявка, из которой выросло дело. Дел без заявки будет больше, чем с ней. */
  leadId: optionalText(40),
});

export type CrmEventCreate = z.infer<typeof crmEventCreateSchema>;

/**
 * Правка. Все поля необязательны: чаще всего меняется один статус — «сделано»
 * нажимается прямо в списке дня, без открытия формы.
 */
export const crmEventUpdateSchema = crmEventCreateSchema
  .extend({ status: crmEventStatusSchema })
  .partial()
  .refine((input) => Object.keys(input).length > 0, { message: 'Нечего менять' })
  .refine((input) => (input.day === undefined) === (input.time === undefined), {
    message: 'Дата и время переносятся вместе',
  });

export type CrmEventUpdate = z.infer<typeof crmEventUpdateSchema>;

/**
 * Занятость: день, в который человека нет.
 *
 * Календарь показывал только то, что запланировано, и на обратный вопрос — «а
 * когда меня нет» — не отвечал. Пустой день выглядит свободным, и в него
 * ставят выезд.
 *
 * 🔴 Занятость личная: у каждого своя. Владелец видит занятость всех,
 * монтажник — свою. Общий на компанию выходной пришлось бы переделывать, как
 * только монтажников станет двое.
 */
export const dayBlockRepeatSchema = z.enum(['once', 'weekly']);

export type DayBlockRepeat = z.infer<typeof dayBlockRepeatSchema>;

export const DAY_BLOCK_REPEATS: readonly DayBlockRepeat[] = dayBlockRepeatSchema.options;

/** Значение из `select` — строка. Принять её за вид повтора без проверки нельзя. */
export function isDayBlockRepeat(value: string): value is DayBlockRepeat {
  return DAY_BLOCK_REPEATS.some((repeat) => repeat === value);
}

/** Минут в сутках. */
export const MINUTES_IN_DAY = 24 * 60;

/** Разовая занятость держит дату, повторяемая — пусто. Пустое поле формы приходит строкой. */
const blockDaySchema = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .default(null)
  .refine((value) => value === null || parseDayKey(value) !== null, {
    message: 'Такой даты не существует',
  });

/** День недели по ISO-8601: 1 — понедельник … 7 — воскресенье. */
const blockWeekdaySchema = z
  .number()
  .int({ message: 'День недели указывается числом от 1 до 7' })
  .min(1, { message: 'День недели указывается числом от 1 до 7' })
  .max(7, { message: 'День недели указывается числом от 1 до 7' })
  .nullable()
  .default(null);

/**
 * Граница окна — минуты от полуночи по московскому времени.
 *
 * Верхняя граница — 23:59, а не «конец суток»: всё, что приходит и уходит
 * через `input[type=time]`, обязано в нём же и представляться, иначе поле
 * получает значение, которое браузер показать не может.
 */
const blockMinuteSchema = z
  .number()
  .int({ message: 'Время указывается как 14:30' })
  .min(0, { message: 'Время указывается как 14:30' })
  .max(MINUTES_IN_DAY - 1, { message: 'Время указывается как 14:30' })
  .nullable()
  .default(null);

export const dayBlockCreateSchema = z
  .object({
    repeat: dayBlockRepeatSchema,
    day: blockDaySchema,
    weekday: blockWeekdaySchema,
    fromMin: blockMinuteSchema,
    toMin: blockMinuteSchema,
    /** Причина показывается рядом с днём: «день закрыт» без причины ничего не решает. */
    reason: optionalText(200),
  })
  .refine((input) => input.repeat !== 'once' || input.day !== null, {
    message: 'Выберите дату',
    path: ['day'],
  })
  .refine((input) => input.repeat !== 'once' || input.weekday === null, {
    message: 'У разовой занятости дня недели нет',
    path: ['weekday'],
  })
  .refine((input) => input.repeat !== 'weekly' || input.weekday !== null, {
    message: 'Выберите день недели',
    path: ['weekday'],
  })
  .refine((input) => input.repeat !== 'weekly' || input.day === null, {
    message: 'У повторяемой занятости даты нет',
    path: ['day'],
  })
  // окно задаётся целиком: «занят с 14:00» без «до» — это не окно, а весь день
  .refine((input) => (input.fromMin === null) === (input.toMin === null), {
    message: 'Укажите и начало, и конец — или оставьте оба пустыми, тогда занят весь день',
    path: ['toMin'],
  })
  .refine(
    (input) => input.fromMin === null || input.toMin === null || input.toMin > input.fromMin,
    {
      message: 'Конец окна должен быть позже начала',
      path: ['toMin'],
    },
  );

export type DayBlockCreate = z.infer<typeof dayBlockCreateSchema>;

/**
 * Правка занятости — тем же телом, что и заведение.
 *
 * Частичной её не делаем: повтор, дата, день недели и окно связаны, и
 * подмножество полей даёт комбинации, которые нечем истолковать — «сменили
 * повтор на недельный, дату не прислали, старая осталась». Занятость мелкая,
 * форма отдаёт её целиком.
 */
export const dayBlockUpdateSchema = dayBlockCreateSchema;

export type DayBlockUpdate = DayBlockCreate;

/* ---------- Поиск по календарю (docs/API.md §9) ---------- */

/**
 * Находка поиска. Схема живёт здесь, а не в репозитории: ответ разбирает
 * клиент, а он серверного кода не видит и видеть не должен.
 *
 * 🔴 Дискриминированное объединение, а не общее поле `title`: называть находку
 * по-русски — дело интерфейса. Сервер отдаёт номер наряда, вид дела и тему
 * обращения, то есть то, что знает сам.
 */
const searchHitBase = {
  id: z.string(),
  clientName: z.string(),
  address: z.string().nullable(),
  /** ISO. У заявки это момент обращения: своей даты работ у неё ещё нет. */
  at: z.string(),
};

export const crmSearchHitSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('event'), eventKind: crmEventKindSchema, ...searchHitBase }),
  z.object({ kind: z.literal('order'), number: z.number().int(), ...searchHitBase }),
  z.object({ kind: z.literal('lead'), topic: z.string(), ...searchHitBase }),
]);

export type CrmSearchHit = z.infer<typeof crmSearchHitSchema>;

export const crmSearchResultSchema = z.object({ items: z.array(crmSearchHitSchema) });
