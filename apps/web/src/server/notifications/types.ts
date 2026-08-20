import { z } from 'zod';

/**
 * Полезная нагрузка уведомления — снимок события на момент его наступления.
 *
 * Она сознательно самодостаточна: воркер не ходит за заявкой в базу заново.
 * Владельцу важно увидеть то, что человек прислал, даже если запись успели
 * поправить в админке, а канал доставки не должен зависеть от схемы таблиц.
 */
const leadPayloadSchema = z.object({
  kind: z.literal('lead'),
  leadId: z.string(),
  name: z.string(),
  phone: z.string(),
  topic: z.string(),
  place: z.string().nullable(),
  qty: z.string().nullable(),
  callTime: z.string().nullable(),
  address: z.string().nullable(),
  comment: z.string().nullable(),
  photo: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});

const toReminderPayloadSchema = z.object({
  kind: z.literal('to-reminder'),
  leadId: z.string(),
  phone: z.string(),
  when: z.string().nullable(),
});

const reviewPayloadSchema = z.object({
  kind: z.literal('review'),
  reviewId: z.string(),
  name: z.string(),
  district: z.string().nullable(),
  rating: z.number().int(),
  text: z.string(),
  photo: z.string().nullable(),
});

export const notificationPayloadSchema = z.discriminatedUnion('kind', [
  leadPayloadSchema,
  toReminderPayloadSchema,
  reviewPayloadSchema,
]);

export type LeadPayload = z.infer<typeof leadPayloadSchema>;
export type ToReminderPayload = z.infer<typeof toReminderPayloadSchema>;
export type ReviewPayload = z.infer<typeof reviewPayloadSchema>;
export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;

export type ChannelName = 'email' | 'telegram';

/**
 * Канал доставки. Реализация не знает ни про очередь, ни про ретраи: её дело —
 * отправить одно сообщение или бросить ошибку, по которой воркер решит,
 * повторять ли попытку.
 */
export type NotificationChannel = {
  readonly name: ChannelName;
  /** Выключенный канал не ставится в очередь: иначе она копила бы заведомо мёртвые записи. */
  isEnabled(): boolean;
  send(payload: NotificationPayload): Promise<void>;
};

export type ChannelRegistry = Readonly<Record<string, NotificationChannel | undefined>>;
