import { z } from 'zod';

import { parseDayKey } from '@/shared/lib/calendar';
import type { Page } from '@/shared/lib/paging';
import { phoneField } from '@/shared/lib/zod';

/**
 * Клиент — человек, с которым компания работает, а не разовое обращение.
 *
 * Заявка отвечает на вопрос «кто написал с сайта» и закрывается статусом.
 * Клиент живёт между обращениями: у него адрес, история работ и техника,
 * которую ему поставили. Отсюда отдельная сущность, а не флаг на заявке
 * (ADR-105).
 */

const NAME_REQUIRED = 'Укажите, как зовут клиента';

const nameSchema = z
  .string({ required_error: NAME_REQUIRED, invalid_type_error: NAME_REQUIRED })
  .trim()
  .min(2, { message: NAME_REQUIRED })
  .max(120, { message: 'Имя длиннее 120 символов не поместится' });

const clientPhoneSchema = phoneField('Укажите телефон клиента');

/** Пустое необязательное поле формы приходит пустой строкой — это «не заполнено». */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Не длиннее ${max} символов` })
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .default(null);

export const clientCreateSchema = z.object({
  name: nameSchema,
  phone: clientPhoneSchema,
  address: optionalText(200),
  note: optionalText(2000),
});

export type ClientCreate = z.infer<typeof clientCreateSchema>;

/**
 * Правка карточки.
 *
 * Телефон правится наравне с остальным: человек меняет номер, и запирать его
 * карточку из-за того, что номер служит ключом дедупликации, нельзя — ключ
 * пересчитывается вместе с полем.
 */
export const clientUpdateSchema = z
  .object({
    name: nameSchema.optional(),
    phone: clientPhoneSchema.optional(),
    address: optionalText(200).optional(),
    note: optionalText(2000).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Нечего сохранять');

export type ClientUpdate = z.infer<typeof clientUpdateSchema>;

/** Клиент в списке и в карточке. */
export type ClientCard = {
  readonly id: string;
  readonly name: string;
  /** Телефон в том виде, в каком его ввели: владелец узнаёт свою запись. */
  readonly phone: string;
  readonly address: string | null;
  readonly note: string | null;
  /** ISO: форматируется при показе, чтобы сервер и клиент не разошлись в поясе. */
  readonly createdAt: string;
  /** Сколько обращений с сайта привязано к человеку. */
  readonly leadCount: number;
};

/** Страница списка карточек — разбивка общая для разделов панели. */
export type ClientPage = Page<ClientCard>;

/* ---------- Техника, стоящая у клиента ---------- */

const UNIT_MODEL_REQUIRED = 'Укажите, что стоит у клиента';

/**
 * Модель строкой, как и в позиции наряда: ставят и технику, купленную
 * клиентом самостоятельно, — такой в каталоге нет и быть не должно.
 */
const unitModelSchema = z
  .string({ required_error: UNIT_MODEL_REQUIRED, invalid_type_error: UNIT_MODEL_REQUIRED })
  .trim()
  .min(2, { message: UNIT_MODEL_REQUIRED })
  .max(160, { message: 'Название длиннее 160 символов не поместится' });

/** Дата монтажа — день, а не момент: час установки никого не интересует. */
const installedAtSchema = z
  .string({ required_error: 'Укажите дату монтажа' })
  .trim()
  .refine((value) => parseDayKey(value) !== null, { message: 'Такой даты не существует' });

/**
 * Гарантия необязательна.
 *
 * 🔴 Пустая дата — рабочее состояние: срок из настроек может быть записан
 * словами, из которых даты не выходит («от 1 до 5 лет в зависимости от
 * модели»). Выдумать её за владельца нельзя — это обещание конкретному
 * человеку, и оно либо есть, либо его нет (CRM.md §8.8).
 */
const warrantyUntilSchema = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .default(null)
  .refine((value) => value === null || parseDayKey(value) !== null, {
    message: 'Такой даты не существует',
  });

export const clientUnitCreateSchema = z.object({
  model: unitModelSchema,
  installedAt: installedAtSchema,
  warrantyUntil: warrantyUntilSchema,
});

export type ClientUnitCreate = z.infer<typeof clientUnitCreateSchema>;

export const clientUnitUpdateSchema = z
  .object({
    model: unitModelSchema.optional(),
    installedAt: installedAtSchema.optional(),
    warrantyUntil: warrantyUntilSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Нечего сохранять');

export type ClientUnitUpdate = z.infer<typeof clientUnitUpdateSchema>;

/**
 * Единица техники в карточке клиента.
 *
 * Даты — ISO: форматируются при показе, чтобы сервер и клиент не разошлись в
 * поясе. Подсказка про ТО здесь не хранится — она считается от даты монтажа
 * (`entities/client/lib/units`): хранимая копия разъехалась бы с датой при
 * первой же правке.
 */
export type ClientUnitCard = {
  readonly id: string;
  readonly model: string;
  readonly installedAt: string;
  readonly warrantyUntil: string | null;
  /** Фотография установки: снимок «после» из наряда. */
  readonly photo: string | null;
  /** Наряд, из которого техника выросла. `null` — запись завели руками. */
  readonly order: { readonly id: string; readonly number: number } | null;
};
