import { z } from 'zod';

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
