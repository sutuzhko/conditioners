import { z } from 'zod';

import { parseDayKey } from '@/shared/lib/calendar';

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
  clientPhone: optionalText(40),
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
