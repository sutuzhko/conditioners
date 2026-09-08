import { z } from 'zod';

import { leadContextSchema } from '@/entities/lead/model';
import { orderEquipSchema, paymentModeSchema, unitSourceSchema } from '@/entities/order/model';
import { stockUnitSchema } from '@/entities/stock/model';

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
  /**
   * Модель, которую человек видел в поле формы и подтвердил (ADR-129).
   * Необязательна по той же причине, что и контекст: в очереди лежат записи,
   * поставленные версией, которая о поле не знала, и воркер обязан разобрать
   * их так же спокойно, как сегодняшние.
   */
  model: z.string().nullable().optional(),
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
  /**
   * Вид работ подписью, а не ключом (ADR-343): справочник правит владелец, а
   * снимок уведомления обязан пережить его правку. Сообщение — это то, что
   * человеку отправили; переименуй владелец «Монтаж» в «Установку» завтра,
   * вчерашнее сообщение переписываться не должно.
   */
  workType: z.string(),
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
  'workType',
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

/**
 * Позиция склада опустилась ниже порога заказа (docs/API.md §14).
 *
 * Снимок, а не ссылка на позицию: сообщение отвечает на вопрос «сколько
 * осталось на тот момент», и остаток, перечитанный воркером через час, ответил
 * бы на другой. Порог рядом с остатком не для красоты — без него владелец не
 * поймёт, почему пришло сообщение именно сейчас.
 */
const stockLowPayloadSchema = z.object({
  kind: z.literal('stock-low'),
  itemId: z.string(),
  name: z.string(),
  group: z.string().nullable(),
  unit: stockUnitSchema,
  qty: z.number(),
  minQty: z.number(),
});

const payloadUnion = z.discriminatedUnion('kind', [
  leadPayloadSchema,
  toReminderPayloadSchema,
  reviewPayloadSchema,
  orderAssignedPayloadSchema,
  orderChangedPayloadSchema,
  orderCancelledPayloadSchema,
  stockLowPayloadSchema,
]);

/**
 * Названия видов работ прежнего перечисления `OrderType` (ADR-343).
 *
 * 🔴 Это не перечень видов работ, а перевод снимка, формата которого больше
 * нет: три значения, которые когда-либо лежали в снятом перечислении схемы, и
 * четвёртому взяться неоткуда. Набор видов работ живёт в справочнике, и
 * добавлять сюда что-либо не нужно и нельзя.
 */
const LEGACY_ORDER_TYPE_TITLES = {
  install: 'Монтаж',
  service: 'Обслуживание',
  repair: 'Ремонт',
} as const;

/**
 * Снимок наряда старого формата: с ключом `type` и без `workType`.
 *
 * `passthrough` — потому что разбирается не весь снимок, а признак его
 * возраста: остальные поля досмотрит союз ниже.
 */
const legacyOrderSnapshotSchema = z
  .object({
    kind: z.enum(['order-assigned', 'order-changed', 'order-cancelled']),
    type: z.enum(['install', 'service', 'repair']),
    /* Ключ старой формы и ключ новой в одном снимке не встречаются: `undefined`
       здесь и означает «снимок старый». */
    workType: z.undefined(),
  })
  .passthrough();

/**
 * 🔴 Уведомление, поставленное в очередь до выкладки, обязано доехать.
 *
 * Снимок самодостаточен и лежит в базе как есть, а выкладка меняет схему
 * разбора: 8 сентября вид работ наряда сменился с ключа `type` на подпись
 * `workType` (ADR-343). Запись, поставленная минутой раньше, разбор бы не
 * прошла **никогда** — воркер повторил бы её до `MAX_ATTEMPTS` и положил в
 * `FAILED`, и повтор из журнала доставки не помог бы тоже. За такой записью
 * стоит наряд, о котором монтажник не узнает: это инвариант 2 по духу —
 * работа не теряется из-за нашей выкладки.
 *
 * Поэтому старая форма принимается и переводится в новую здесь, на входе
 * разбора: ключ вида работ становится подписью, а `changes` — списком полей
 * сегодняшнего снимка. Показ такую запись переживал и раньше
 * (`repo/notifications.ts` разбирает через `safeParse`), отправка — нет.
 */
function upgradeOrderSnapshot(value: unknown): unknown {
  const legacy = legacyOrderSnapshotSchema.safeParse(value);
  if (!legacy.success) return value;

  const { type, ...rest } = legacy.data;
  const upgraded: Record<string, unknown> = { ...rest, workType: LEGACY_ORDER_TYPE_TITLES[type] };

  /* Список изменившихся полей знал тот же ключ: «изменился тип работ» в
     сообщении о правке наряда обязано остаться на месте. */
  const changes = rest['changes'];
  if (Array.isArray(changes)) {
    upgraded['changes'] = changes.map((field: unknown) => (field === 'type' ? 'workType' : field));
  }

  return upgraded;
}

export const notificationPayloadSchema = z.preprocess(upgradeOrderSnapshot, payloadUnion);

export type LeadPayload = z.infer<typeof leadPayloadSchema>;
export type ToReminderPayload = z.infer<typeof toReminderPayloadSchema>;
export type ReviewPayload = z.infer<typeof reviewPayloadSchema>;
export type OrderUnitBrief = z.infer<typeof orderUnitBriefSchema>;
export type OrderAssignedPayload = z.infer<typeof orderAssignedPayloadSchema>;
export type OrderChangedPayload = z.infer<typeof orderChangedPayloadSchema>;
export type OrderCancelledPayload = z.infer<typeof orderCancelledPayloadSchema>;
export type StockLowPayload = z.infer<typeof stockLowPayloadSchema>;
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
