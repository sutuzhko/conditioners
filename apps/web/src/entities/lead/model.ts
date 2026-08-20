import { z } from 'zod';

import { consentSchema, honeypotSchema } from '@/shared/lib/zod';

/**
 * Заявка — главная ценность сайта.
 *
 * 🔴 Порядок обработки: валидация → запись в БД → постановка уведомления в
 * очередь (инвариант 2). Схема здесь общая для клиента и сервера: клиентская
 * валидация это UX, серверная — единственная настоящая (docs/CLAUDE.md).
 */
export const leadStatusSchema = z.enum(['new', 'in_progress', 'done', 'rejected']);

export type LeadStatus = z.infer<typeof leadStatusSchema>;

/**
 * Телефон принимается в любом виде, лишь бы в нём было достаточно цифр:
 * человек в жару набирает номер как привык, и терять заявку из-за скобок
 * нельзя. К единому виду его приводит `shared/lib/format`.
 */
export const phoneSchema = z
  .string()
  .trim()
  .min(1, { message: 'Укажите телефон — по нему мы перезвоним' })
  .refine((value) => value.replace(/\D/g, '').length >= 10, {
    message: 'Похоже, в номере не хватает цифр',
  });

/** UTM-метки: произвольный набор ключей, приходит из адресной строки. */
export const utmSchema = z.record(z.string(), z.string());

export const leadSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  phone: phoneSchema,
  topic: z.string().trim().min(1),
  place: z.string().nullable().default(null),
  qty: z.string().nullable().default(null),
  callTime: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  comment: z.string().nullable().default(null),
  photo: z.string().nullable().default(null),
  sourceUrl: z.string().nullable().default(null),
  referrer: z.string().nullable().default(null),
  utm: utmSchema.nullable().default(null),
  consentAt: z.coerce.date(),
  status: leadStatusSchema.default('new'),
  managerComment: z.string().nullable().default(null),
  createdAt: z.coerce.date(),
});

export type Lead = z.infer<typeof leadSchema>;

/** Публичная форма заявки. */
export const leadInputSchema = z.object({
  name: z.string().trim().min(2, { message: 'Как к вам обращаться?' }).max(80),
  phone: phoneSchema,
  topic: z.string().trim().max(80).optional(),
  place: z.string().trim().max(80).optional(),
  qty: z.string().trim().max(40).optional(),
  callTime: z.string().trim().max(80).optional(),
  address: z.string().trim().max(200).optional(),
  comment: z.string().trim().max(2000).optional(),
  sourceUrl: z.string().trim().max(2000).optional(),
  referrer: z.string().trim().max(2000).optional(),
  utm: utmSchema.optional(),
  consent: consentSchema,
  hp: honeypotSchema,
});

export type LeadInput = z.infer<typeof leadInputSchema>;

/** Напоминание о ТО: короткая форма, только телефон и удобное время. */
export const toReminderSchema = z.object({
  phone: phoneSchema,
  when: z.string().trim().max(80).optional(),
  consent: consentSchema,
  hp: honeypotSchema,
});

export type ToReminderInput = z.infer<typeof toReminderSchema>;

/** Правка заявки в админке: статус и комментарий менеджера, больше ничего. */
export const leadUpdateSchema = z.object({
  status: leadStatusSchema.optional(),
  managerComment: z.string().trim().max(2000).nullable().optional(),
});

export type LeadUpdate = z.infer<typeof leadUpdateSchema>;
