import { z } from 'zod';

import { parseDayKey } from '@/shared/lib/calendar';
import type { Employment } from '@/shared/lib/employment';

/**
 * Наряд — работа с деньгами, датой и исполнителем.
 *
 * Граница с делом календаря проведена в ADR-093: монтаж, ТО и ремонт всегда
 * заводятся нарядом, дело остаётся напоминанием без денег. Два источника
 * правды об одном выезде — это разошедшиеся суммы и потерянный монтажник.
 *
 * Контракт маршрутов — docs/API.md §13, разбор прототипа — docs/CRM.md §3.3.
 */

export const orderTypeSchema = z.enum(['install', 'service', 'repair']);
export type OrderType = z.infer<typeof orderTypeSchema>;
export const ORDER_TYPES: readonly OrderType[] = orderTypeSchema.options;

export const orderStatusSchema = z.enum(['new', 'assigned', 'in_progress', 'done', 'cancelled']);
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export const ORDER_STATUSES: readonly OrderStatus[] = orderStatusSchema.options;

export const paymentModeSchema = z.enum(['company', 'cash_to_installer']);
export type PaymentMode = z.infer<typeof paymentModeSchema>;
export const PAYMENT_MODES: readonly PaymentMode[] = paymentModeSchema.options;

export const orderEquipSchema = z.enum([
  'conditioner',
  'fridge',
  'compressor',
  'ventilation',
  'heat_curtain',
  'other',
]);
export type OrderEquip = z.infer<typeof orderEquipSchema>;
export const ORDER_EQUIPS: readonly OrderEquip[] = orderEquipSchema.options;

export const unitSourceSchema = z.enum(['ours', 'client']);
export type UnitSource = z.infer<typeof unitSourceSchema>;
export const UNIT_SOURCES: readonly UnitSource[] = unitSourceSchema.options;

/** Значение из `select` — строка. Принять её за статус без проверки нельзя. */
export function isOrderStatus(value: string): value is OrderStatus {
  return ORDER_STATUSES.some((status) => status === value);
}

export function isOrderType(value: string): value is OrderType {
  return ORDER_TYPES.some((type) => type === value);
}

/**
 * 🔴 Что монтажник может сделать со статусом сам: выехал и закончил.
 *
 * Назначение, отказ и возврат в работу — решения владельца: монтажник,
 * закрывающий чужой наряд отказом, ломает и деньги, и график. Проверяется на
 * сервере, а не скрытием пунктов в `select` (CRM.md §6).
 */
export const INSTALLER_STATUSES: readonly OrderStatus[] = ['in_progress', 'done'];

export function installerMaySetStatus(status: OrderStatus): boolean {
  return INSTALLER_STATUSES.some((allowed) => allowed === status);
}

/**
 * Дата и время приходят двумя полями, а не одним `datetime-local`: на телефоне
 * это два привычных выбора вместо одного неудобного. Так же, как у дела
 * календаря (docs/API.md §9).
 */
const daySchema = z
  .string({ required_error: 'Выберите дату' })
  .trim()
  .refine((value) => parseDayKey(value) !== null, { message: 'Такой даты не существует' });

const timeSchema = z
  .string({ required_error: 'Укажите время' })
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'Время указывается как 11:00' });

/** Пустое необязательное поле формы приходит пустой строкой — это «не заполнено». */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Не длиннее ${max} символов` })
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .default(null);

/** Деньги целые: копеек на этом рынке не бывает, а «38 500,00» никто не вводит. */
const moneySchema = z
  .number({ invalid_type_error: 'Сумма — это число' })
  .int({ message: 'Сумма указывается целым числом рублей' })
  .min(0, { message: 'Сумма не может быть отрицательной' })
  .max(10_000_000, { message: 'Похоже, в сумме лишний ноль' });

/**
 * Длительность в минутах, а не в часах: полтора часа на ТО — обычное дело, а
 * загрузка бригад считается по минутам, а не округляется вверх.
 */
const durationSchema = z
  .number({ invalid_type_error: 'Длительность — это число минут' })
  .int({ message: 'Длительность указывается целыми минутами' })
  .min(15, { message: 'Меньше пятнадцати минут работы не бывает' })
  .max(24 * 60, { message: 'Наряд длиннее суток нужно разбить на несколько' });

const ADDRESS_REQUIRED = 'Укажите адрес объекта';

export const orderUnitInputSchema = z.object({
  equip: orderEquipSchema.default('conditioner'),
  /** Модель строкой: ставят и то, что клиент купил сам — такого в каталоге нет. */
  model: optionalText(160),
  source: unitSourceSchema.default('ours'),
  trassaM: z
    .number()
    .int({ message: 'Длина трассы указывается целыми метрами' })
    .min(0, { message: 'Длина трассы не может быть отрицательной' })
    .max(100, { message: 'Трасса длиннее ста метров — это ошибка ввода' })
    .nullable()
    .default(null),
  /** Диаметр строкой: пишут «1/4–3/8», а не число. */
  diameter: optionalText(40),
  shtrob: z.boolean().default(false),
});

export type OrderUnitInput = z.infer<typeof orderUnitInputSchema>;

const baseOrderFields = {
  type: orderTypeSchema,
  clientId: z.string({ required_error: 'Выберите клиента' }).trim().min(1, {
    message: 'Выберите клиента',
  }),
  /** Не назначен — обычное состояние: наряд заводят раньше, чем решают, кто поедет. */
  installerId: optionalText(40),
  day: daySchema,
  time: timeSchema,
  durationMin: durationSchema.default(120),

  address: z
    .string({ required_error: ADDRESS_REQUIRED })
    .trim()
    .min(3, { message: ADDRESS_REQUIRED })
    .max(200, { message: 'Адрес длиннее 200 символов не поместится' }),
  intercom: optionalText(40),
  phone2: optionalText(40),
  floor: z
    .number()
    .int({ message: 'Этаж — целое число' })
    .min(-5, { message: 'Такого этажа не бывает' })
    .max(100, { message: 'Такого этажа не бывает' })
    .nullable()
    .default(null),
  heightWorks: z.boolean().default(false),

  payment: paymentModeSchema.default('company'),
  price: moneySchema.default(0),
  installerFee: moneySchema.default(0),
  deductionSum: moneySchema.default(0),
  deductionReason: optionalText(500),

  comment: optionalText(2000),
  ownerNote: optionalText(2000),
  leadId: optionalText(40),

  /** Позиции приходят и уходят вместе с нарядом: своих маршрутов у них нет. */
  units: z.array(orderUnitInputSchema).max(20, { message: 'Двадцати позиций хватит' }).default([]),
};

/**
 * 🔴 Удержание без основания не записывается.
 *
 * Сумма без причины через полгода не значит ничего — ни для владельца, ни для
 * разговора с человеком, у которого её удержали. Разбор — CRM.md §9.
 */
const requireDeductionReason = <T extends { deductionSum: number; deductionReason: string | null }>(
  value: T,
  ctx: z.RefinementCtx,
): void => {
  if (value.deductionSum > 0 && value.deductionReason === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Укажите основание удержания',
      path: ['deductionReason'],
    });
  }
};

export const orderCreateSchema = z.object(baseOrderFields).superRefine(requireDeductionReason);

export type OrderCreate = z.infer<typeof orderCreateSchema>;

/**
 * Правка наряда владельцем.
 *
 * `day` и `time` переносятся только вместе: перенести работу на другой день,
 * не сказав на какое время, нельзя — монтажник узнает об этом на объекте.
 */
export const orderUpdateSchema = z
  .object({
    type: orderTypeSchema.optional(),
    status: orderStatusSchema.optional(),
    clientId: baseOrderFields.clientId.optional(),
    installerId: baseOrderFields.installerId.optional(),
    day: daySchema.optional(),
    time: timeSchema.optional(),
    durationMin: durationSchema.optional(),
    address: baseOrderFields.address.optional(),
    intercom: baseOrderFields.intercom.optional(),
    phone2: baseOrderFields.phone2.optional(),
    floor: baseOrderFields.floor.optional(),
    heightWorks: z.boolean().optional(),
    payment: paymentModeSchema.optional(),
    price: moneySchema.optional(),
    installerFee: moneySchema.optional(),
    deductionSum: moneySchema.optional(),
    deductionReason: baseOrderFields.deductionReason.optional(),
    comment: baseOrderFields.comment.optional(),
    ownerNote: baseOrderFields.ownerNote.optional(),
    leadId: baseOrderFields.leadId.optional(),
    units: baseOrderFields.units.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, 'Нечего сохранять')
  .refine(
    (value) => (value.day === undefined) === (value.time === undefined),
    'Дата и время переносятся только вместе',
  )
  .superRefine((value, ctx) => {
    /* Основание требуется только когда сумму действительно присылают: правка
       одного адреса не обязана нести причину удержания, поставленного месяц
       назад. Полноту связки «сумма без основания» досматривает репозиторий на
       уже собранной записи. */
    if (value.deductionSum !== undefined && value.deductionSum > 0) {
      if (value.deductionReason === null || value.deductionReason === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Укажите основание удержания',
          path: ['deductionReason'],
        });
      }
    }
  });

export type OrderUpdate = z.infer<typeof orderUpdateSchema>;

/** Правка наряда монтажником: только статус, и только два его значения. */
export const orderInstallerUpdateSchema = z
  .object({
    status: z.enum(['in_progress', 'done'], {
      errorMap: () => ({ message: 'Такой переход монтажнику недоступен' }),
    }),
  })
  .strict();

export type OrderInstallerUpdate = z.infer<typeof orderInstallerUpdateSchema>;

// ---------- Представление ----------

/** Клиент в наряде: столько, сколько нужно, чтобы позвонить и поехать. */
export type OrderClientRef = {
  readonly id: string;
  readonly name: string;
  readonly phone: string;
};

export type OrderInstallerRef = {
  readonly id: string;
  readonly name: string | null;
  readonly login: string;
  /** От оформления зависит смысл удержания, а не его наличие (CRM.md §9). */
  readonly employment: Employment | null;
};

export type OrderUnitCard = OrderUnitInput & { readonly id: string; readonly sort: number };

/**
 * Наряд, как его отдаёт сервер.
 *
 * 🔴 Закрытые от монтажника поля необязательны намеренно: их не приводят к
 * `null`, а не кладут в ответ вовсе. `null` сообщал бы, что поле есть и оно
 * пустое, — а монтажнику не положено знать даже этого (docs/API.md §13).
 */
export type OrderCard = {
  readonly id: string;
  readonly number: number;
  readonly type: OrderType;
  readonly status: OrderStatus;
  readonly client: OrderClientRef;
  readonly installer: OrderInstallerRef | null;
  /** ISO в UTC; в московское время переводит `shared/lib/calendar` при показе. */
  readonly at: string;
  readonly durationMin: number;
  readonly address: string;
  readonly intercom: string | null;
  readonly phone2: string | null;
  readonly floor: number | null;
  readonly heightWorks: boolean;
  readonly payment: PaymentMode;
  /** Монтажнику приходит только при оплате наличными: сумму нужно принять. */
  readonly price?: number;
  readonly installerFee: number;
  readonly deductionSum?: number;
  readonly deductionReason?: string | null;
  readonly comment: string | null;
  readonly ownerNote?: string | null;
  readonly leadId: string | null;
  readonly units: readonly OrderUnitCard[];

  /**
   * Итог работ: что сделали сверх наряда и отчёт о выезде. Приходит обеим
   * ролям — это отчёт монтажника, и он же его заполняет (docs/CRM.md §3.3).
   */
  readonly extraWork: string | null;
  readonly report: string | null;
  /** ISO в UTC; `null` — итог ещё не заполняли. */
  readonly resultAt: string | null;

  readonly createdAt: string;
};

/** Вкладки списка нарядов. Без параметра открываются «Активные». */
export const orderTabSchema = z.enum(['active', 'new', 'history', 'cancelled', 'all']);
export type OrderTab = z.infer<typeof orderTabSchema>;
export const ORDER_TABS: readonly OrderTab[] = orderTabSchema.options;

export function isOrderTab(value: string): value is OrderTab {
  return ORDER_TABS.some((tab) => tab === value);
}

/** Фильтр по периоду: всё время, этот месяц, прошлый. */
export const orderPeriodSchema = z.enum(['all', 'month', 'prev']);
export type OrderPeriod = z.infer<typeof orderPeriodSchema>;
export const ORDER_PERIODS: readonly OrderPeriod[] = orderPeriodSchema.options;

export function isOrderPeriod(value: string): value is OrderPeriod {
  return ORDER_PERIODS.some((period) => period === value);
}

/** Какие статусы показывает вкладка. `all` — все, поэтому её здесь нет. */
export const TAB_STATUSES: Readonly<Record<Exclude<OrderTab, 'all'>, readonly OrderStatus[]>> = {
  active: ['assigned', 'in_progress'],
  new: ['new'],
  history: ['done'],
  cancelled: ['cancelled'],
};

// ---------- Наряд в работе: итог, чеклист, документы, фото, история ----------

/**
 * Итог работ — docs/CRM.md §3.3.
 *
 * 🔴 Плановую сумму итог не правит. Что сделали сверх наряда, записывается
 * словами; сколько за это взять с клиента, решает владелец в полях денег.
 * Иначе монтажник, дописавший «плюс два метра трассы», менял бы цену заказа
 * с объекта — а цену на этом сайте не меняют задним числом (инвариант 14).
 */
export const orderResultSchema = z
  .object({
    extraWork: optionalText(4000),
    report: optionalText(4000),
  })
  .strict();

export type OrderResultInput = z.infer<typeof orderResultSchema>;

/** Свой пункт чеклиста: то, что человек дописал к собранному списку. */
export const checklistItemCreateSchema = z
  .object({
    text: z
      .string({ required_error: 'Напишите, что взять' })
      .trim()
      .min(2, { message: 'Напишите, что взять' })
      .max(200, { message: 'Пункт длиннее 200 символов не читают' }),
  })
  .strict();

export type ChecklistItemCreate = z.infer<typeof checklistItemCreateSchema>;

/** Отметка при сборах. Текст собранного пункта не правится — он из наряда. */
export const checklistItemUpdateSchema = z.object({ done: z.boolean() }).strict();

export type ChecklistItemUpdate = z.infer<typeof checklistItemUpdateSchema>;

export const orderDocKindSchema = z.enum([
  'contract',
  'warranty',
  'act',
  'invoice',
  'measure',
  'other',
]);
export type OrderDocKind = z.infer<typeof orderDocKindSchema>;
export const ORDER_DOC_KINDS: readonly OrderDocKind[] = orderDocKindSchema.options;

export function isOrderDocKind(value: string): value is OrderDocKind {
  return ORDER_DOC_KINDS.some((kind) => kind === value);
}

/**
 * Этап съёмки. `before` — место установки: снимает владелец, смотрит
 * монтажник. `after` — выполненные работы: снимает монтажник, снимок остаётся
 * в истории клиента (docs/CRM.md §3.3).
 */
export const photoStageSchema = z.enum(['before', 'after']);
export type PhotoStage = z.infer<typeof photoStageSchema>;
export const PHOTO_STAGES: readonly PhotoStage[] = photoStageSchema.options;

export function isPhotoStage(value: string): value is PhotoStage {
  return PHOTO_STAGES.some((stage) => stage === value);
}

export type OrderChecklistCard = {
  readonly id: string;
  readonly text: string;
  readonly done: boolean;
  /** Дописан человеком: пересборка такой пункт сохраняет, а удалить его можно. */
  readonly own: boolean;
  readonly sort: number;
};

/**
 * 🔴 `url` документа — адрес закрытого маршрута выдачи, а не путь к файлу на
 * диске. Договоры — персональные данные, и публичный `/api/media/{name}` для
 * них не годится: он открыт (docs/CRM.md §9).
 */
export type OrderDocCard = {
  readonly id: string;
  readonly kind: OrderDocKind;
  readonly name: string;
  readonly url: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
};

export type OrderPhotoCard = {
  readonly id: string;
  readonly stage: PhotoStage;
  readonly url: string;
  readonly sort: number;
};

export type OrderHistoryEntry = {
  readonly id: string;
  readonly text: string;
  /** Автор мог быть удалён из панели — запись остаётся, подпись пропадает. */
  readonly author: string | null;
  readonly createdAt: string;
};

/**
 * Карточка наряда целиком: список нарядов такого не возит.
 *
 * 🔴 `history` необязательна намеренно — монтажнику она не кладётся вовсе.
 * История хранит и переназначения: кого сняли с наряда и кого поставили
 * вместо него, — а это разговор владельца с людьми, а не рабочий экран
 * монтажника (docs/CRM.md §6).
 */
export type OrderDetails = OrderCard & {
  readonly checklist: readonly OrderChecklistCard[];
  readonly docs: readonly OrderDocCard[];
  readonly photos: readonly OrderPhotoCard[];
  readonly history?: readonly OrderHistoryEntry[];
};
