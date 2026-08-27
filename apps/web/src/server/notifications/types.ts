import { z } from 'zod';

import { leadContextSchema } from '@/entities/lead/model';
import {
  orderEquipSchema,
  orderTypeSchema,
  paymentModeSchema,
  unitSourceSchema,
} from '@/entities/order/model';

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
  /**
   * Что человек делал на сайте до отправки: расчёт монтажа, подбор по площади,
   * модель у кнопки «Заказать», отмеченные модели. Снимок, а не ссылки — по той
   * же причине, по которой самодостаточна вся нагрузка: владелец читает
   * сообщение, чтобы перезвонить, и цена в нём обязана совпасть с той, что
   * человек видел на экране.
   *
   * Необязателен: в очереди лежат записи, поставленные версией, которая о
   * контексте не знала, и воркер обязан разобрать их так же спокойно, как
   * сегодняшние.
   */
  context: leadContextSchema.nullable().optional(),
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
  rating: z.number().int(),
  text: z.string(),
  photo: z.string().nullable(),
});

/** Позиция наряда в том виде, в каком её видит монтажник. */
const orderUnitBriefSchema = z.object({
  equip: orderEquipSchema,
  model: z.string().nullable(),
  source: unitSourceSchema,
  trassaM: z.number().int().nullable(),
  diameter: z.string().nullable(),
  shtrob: z.boolean(),
});

/**
 * 🔴 Вводные наряда — ровно то, что монтажник видит в своей карточке
 * (docs/API.md §13). Заметки владельца и удержаний здесь нет вовсе, а не
 * приведёнными к `null`: нарушить это разграничение сообщением — то же
 * самое, что нарушить его ответом API (ADR-114).
 *
 * `price` необязателен намеренно: сумма заказа приходит только при оплате
 * наличными, где её нужно принять от клиента.
 */
const orderBriefFields = {
  orderId: z.string(),
  number: z.number().int(),
  type: orderTypeSchema,
  /** Момент в UTC; в московское время переводит показ. */
  at: z.string(),
  durationMin: z.number().int(),
  address: z.string(),
  intercom: z.string().nullable(),
  phone2: z.string().nullable(),
  floor: z.number().int().nullable(),
  heightWorks: z.boolean(),
  clientName: z.string(),
  clientPhone: z.string(),
  payment: paymentModeSchema,
  price: z.number().int().optional(),
  installerFee: z.number().int(),
  comment: z.string().nullable(),
  units: z.array(orderUnitBriefSchema),
};

/**
 * Что именно поменялось во вводных. Ключи — поля брифа, а не свободный текст:
 * подпись для человека собирает `format.ts`, снимок хранит факт.
 */
export const orderBriefFieldSchema = z.enum([
  'type',
  'at',
  'durationMin',
  'address',
  'intercom',
  'phone2',
  'floor',
  'heightWorks',
  'client',
  'payment',
  'price',
  'installerFee',
  'comment',
  'units',
]);

export type OrderBriefField = z.infer<typeof orderBriefFieldSchema>;

const orderAssignedPayloadSchema = z.object({
  kind: z.literal('order-assigned'),
  ...orderBriefFields,
});

const orderChangedPayloadSchema = z.object({
  kind: z.literal('order-changed'),
  ...orderBriefFields,
  changes: z.array(orderBriefFieldSchema).min(1),
});

/**
 * Наряд ушёл от человека: отменён совсем, передан другому или просто снят.
 * Причины разделены, потому что это разные факты, а сообщать монтажнику
 * «передан другому» там, где исполнителя сняли и не назначили, — неправда.
 */
export const orderCancelReasonSchema = z.enum(['cancelled', 'reassigned', 'unassigned']);
export type OrderCancelReason = z.infer<typeof orderCancelReasonSchema>;

const orderCancelledPayloadSchema = z.object({
  kind: z.literal('order-cancelled'),
  ...orderBriefFields,
  reason: orderCancelReasonSchema,
});

export const notificationPayloadSchema = z.discriminatedUnion('kind', [
  leadPayloadSchema,
  toReminderPayloadSchema,
  reviewPayloadSchema,
  orderAssignedPayloadSchema,
  orderChangedPayloadSchema,
  orderCancelledPayloadSchema,
]);

export type LeadPayload = z.infer<typeof leadPayloadSchema>;
export type ToReminderPayload = z.infer<typeof toReminderPayloadSchema>;
export type ReviewPayload = z.infer<typeof reviewPayloadSchema>;
export type OrderUnitBrief = z.infer<typeof orderUnitBriefSchema>;
export type OrderAssignedPayload = z.infer<typeof orderAssignedPayloadSchema>;
export type OrderChangedPayload = z.infer<typeof orderChangedPayloadSchema>;
export type OrderCancelledPayload = z.infer<typeof orderCancelledPayloadSchema>;
export type NotificationPayload = z.infer<typeof notificationPayloadSchema>;

/** Вид события. Он же `Notification.kind` в базе и ключ таблицы адресации. */
export type NotificationKind = NotificationPayload['kind'];

/** Снимок наряда без вида события: его собирает `orders.ts`. */
export type OrderBrief = Omit<OrderAssignedPayload, 'kind'>;

export type ChannelName = 'email' | 'telegram';

/**
 * Канал доставки. Реализация не знает ни про очередь, ни про ретраи: её дело —
 * отправить одно сообщение или бросить ошибку, по которой воркер решит,
 * повторять ли попытку.
 *
 * Адрес приходит извне и перекрывает общий адрес компании: у адресного
 * уведомления получатель личный, и доставлять его владельцу нельзя.
 */
export type NotificationChannel = {
  readonly name: ChannelName;
  /**
   * Выключенный канал не ставится в очередь: иначе она копила бы заведомо
   * мёртвые записи. Без адреса проверяется общий адрес владельца из настроек.
   */
  isEnabled(address?: string | null): boolean;
  send(payload: NotificationPayload, address?: string | null): Promise<void>;
};

export type ChannelRegistry = Readonly<Record<string, NotificationChannel | undefined>>;
