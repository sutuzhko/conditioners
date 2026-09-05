import { z } from 'zod';

import type { BadgeVariant } from '@/shared/ui';

import { CANCEL_NOTE_MAX, CANCEL_REASONS } from '@/shared/lib/cancel-reason';
import { consentSchema, honeypotSchema, phoneField } from '@/shared/lib/zod';

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
 * Как статус называется для человека.
 *
 * Живёт в домене, а не в подписях раздела: статус заявки видят и раздел
 * заявок, и карточка клиента, и вторая копия названий разошлась бы с первой
 * при первом же переименовании.
 */
const STATUS_TITLES: Record<LeadStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  done: 'Завершена',
  rejected: 'Отказ',
};

export function leadStatusTitle(status: LeadStatus): string {
  return STATUS_TITLES[status];
}

/**
 * 🔴 Краска плашки — из общего словаря статусов панели
 * (`design/admin/Kit.body.html`, issue #326). Живёт в домене по той же
 * причине, что и название: статус видят раздел заявок и карточка клиента, а
 * вторая копия расходится с первой при первой же правке — так уже было,
 * «Новая» была бирюзовой в одном разделе и янтарной в другом.
 *
 * `new` — янтарный: заявка ждёт ответа, и это единственный статус, который
 * стоит денег. `rejected` — серый: действий больше не требует.
 */
export const LEAD_STATUS_VARIANT: Record<LeadStatus, BadgeVariant> = {
  new: 'warning',
  in_progress: 'accent',
  done: 'success',
  rejected: 'neutral',
};

/** Правило одно на проект (`shared/lib/zod`), своя здесь только формулировка. */
export const phoneSchema = phoneField('Укажите телефон — по нему мы перезвоним');

/** UTM-метки: произвольный набор ключей, приходит из адресной строки. */
export const utmSchema = z.record(z.string(), z.string());

/**
 * Контекст заявки: границы снимка. Всё, что приходит из браузера, обязано
 * иметь потолок — иначе поле `context` становится дырой в базу.
 */

/** Длина слага модели. */
const CONTEXT_SLUG_MAX = 120;
/** Название модели и значение параметра — то, что помещается в строку карточки. */
const CONTEXT_NAME_MAX = 120;
/** Подпись параметра или слагаемого сметы. */
const CONTEXT_LABEL_MAX = 120;
/** Потолок суммы: цена монтажа и цена модели в рублях. */
const CONTEXT_MONEY_MAX = 100_000_000;
/** Сколько условий расчёта и слагаемых сметы переносится в заявку. */
const CONTEXT_PARAMS_MAX = 12;
/** Сколько блоков считает калькулятор — граница интерфейса, не сметы. */
const CONTEXT_QTY_MAX = 99;
/** Площадь помещения из подбора, м². */
const CONTEXT_AREA_MAX = 1000;
/**
 * Сколько отмеченных моделей уезжает с заявкой. Лимита на сравнение в
 * каталоге нет намеренно (решение владельца 26 августа), но заявка — не
 * таблица: список из полусотни названий владелец читать не станет, а поле
 * `context` не место для выгрузки каталога.
 */
export const LEAD_CONTEXT_LIKED_MAX = 12;

/**
 * Текст снимка подрезается, а не отвергается: длинное название модели —
 * это норма, которую задал владелец в админке, и терять из-за него весь
 * контекст заявки нельзя.
 */
function contextText(max: number) {
  return z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.slice(0, max));
}

/** Список подрезается по той же причине: отметить два десятка моделей — право человека. */
function contextList<T extends z.ZodTypeAny>(item: T, max: number) {
  return z.array(item).transform((items) => items.slice(0, max));
}

/**
 * Сумма снимка. Не целое: ставка допработ приходит из админки и вправе быть
 * дробной, а округляет уже показ (`formatMoney`) — и в карточке заявки, и в
 * уведомлении он тот же самый, поэтому владелец видит ровно ту цифру, что
 * стояла на экране у клиента.
 */
const contextMoney = z.number().finite().min(0).max(CONTEXT_MONEY_MAX);

/** Модель так, как она стояла на экране: название и цена на момент отправки. */
export const leadContextModelSchema = z.object({
  slug: contextText(CONTEXT_SLUG_MAX),
  name: contextText(CONTEXT_NAME_MAX),
  /** Действующая цена. `null` — цена рядом с моделью не показывалась. */
  price: contextMoney.nullable().default(null),
  /** 🔴 Перечёркнутая цена — только та, что действительно стояла рядом (ADR-011). */
  oldPrice: contextMoney.nullable().default(null),
});

/** Условие расчёта: подпись и значение теми же словами, что на экране. */
export const leadContextLineSchema = z.object({
  label: contextText(CONTEXT_LABEL_MAX),
  value: contextText(CONTEXT_NAME_MAX),
});

/** Слагаемое сметы: подпись разбивки и сумма. */
export const leadContextAmountSchema = z.object({
  label: contextText(CONTEXT_LABEL_MAX),
  amount: contextMoney,
});

/** Расчёт калькулятора: что человек ввёл и что ему показали. */
export const leadContextEstimateSchema = z.object({
  params: contextList(leadContextLineSchema, CONTEXT_PARAMS_MAX),
  lines: contextList(leadContextAmountSchema, CONTEXT_PARAMS_MAX),
  /** Сумма за один блок — только когда блоков больше одного. */
  perUnit: contextMoney.nullable().default(null),
  qty: z.number().int().min(1).max(CONTEXT_QTY_MAX),
  total: contextMoney,
});

/** Подбор по площади из первого экрана. */
export const leadContextPickSchema = z.object({
  area: z.number().int().min(1).max(CONTEXT_AREA_MAX),
  place: contextText(CONTEXT_NAME_MAX),
  /** Что подобралось. `null` — каталог пуст, подбирать было не из чего. */
  model: leadContextModelSchema.nullable().default(null),
});

/**
 * 🔴 Контекст заявки — снимок того, что человек видел на экране перед
 * отправкой: расчёт калькулятора, подбор по площади, модель у кнопки
 * «Заказать» и отмеченные модели.
 *
 * Именно снимок, а не ссылки на модели и строки прайса: цены и каталог
 * правятся из админки, и заявка, показывающая сегодняшнюю цену вместо
 * вчерашней, — это разговор, в котором клиент прав, а владелец выглядит
 * обманщиком. Красная линия «не врать в цене» работает в обе стороны.
 *
 * Контекст приходит из браузера, то есть это внешние данные: неизвестные
 * ключи отбрасываются (обычный, не `strict`, разбор), тексты подрезаются,
 * числа проверяются границами. Персональных данных здесь нет и быть не
 * может — только параметры расчёта, названия и цены моделей.
 *
 * Всё необязательно: человек вправе открыть форму и просто написать.
 */
export const leadContextSchema = z.object({
  estimate: leadContextEstimateSchema.nullable().default(null),
  pick: leadContextPickSchema.nullable().default(null),
  /** Модель, с карточки которой нажали «Заказать». */
  model: leadContextModelSchema.nullable().default(null),
  /** Отмеченные модели: явное «мне интересны вот эти», а не пассивный след. */
  liked: contextList(leadContextModelSchema, LEAD_CONTEXT_LIKED_MAX).default([]),
});

export type LeadContext = z.infer<typeof leadContextSchema>;
export type LeadContextModel = z.infer<typeof leadContextModelSchema>;
export type LeadContextLine = z.infer<typeof leadContextLineSchema>;
export type LeadContextAmount = z.infer<typeof leadContextAmountSchema>;
export type LeadContextEstimate = z.infer<typeof leadContextEstimateSchema>;
export type LeadContextPick = z.infer<typeof leadContextPickSchema>;

export const leadSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  phone: phoneSchema,
  topic: z.string().trim().min(1),
  /** Модель, ради которой нажали кнопку. Видимое поле формы (ADR-129). */
  model: z.string().nullable().default(null),
  place: z.string().nullable().default(null),
  qty: z.string().nullable().default(null),
  callTime: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  comment: z.string().nullable().default(null),
  photo: z.string().nullable().default(null),
  sourceUrl: z.string().nullable().default(null),
  referrer: z.string().nullable().default(null),
  utm: utmSchema.nullable().default(null),
  context: leadContextSchema.nullable().default(null),
  consentAt: z.coerce.date(),
  status: leadStatusSchema.default('new'),
  managerComment: z.string().nullable().default(null),
  createdAt: z.coerce.date(),
});

export type Lead = z.infer<typeof leadSchema>;

const NAME_REQUIRED = 'Как к вам обращаться?';

/**
 * Публичная форма заявки.
 *
 * Тексты ошибок показываются человеку как есть, поэтому все ограничения
 * подписаны по-русски: сообщение по умолчанию от Zod английское, а форма —
 * последний шаг перед заявкой, и непонятная надпись там стоит клиента.
 */
export const leadInputSchema = z.object({
  name: z
    .string({ required_error: NAME_REQUIRED, invalid_type_error: NAME_REQUIRED })
    .trim()
    .min(2, { message: NAME_REQUIRED })
    .max(80, { message: 'Имя длиннее 80 символов не поместится' }),
  phone: phoneSchema,
  topic: z
    .string()
    .trim()
    .max(80, { message: 'Тема длиннее 80 символов не поместится' })
    .optional(),
  /**
   * Модель, ради которой нажали кнопку (ADR-129). Свободный текст, а не слаг:
   * поле видимое и правится человеком — он вправе написать «что-нибудь на
   * 20 метров» вместо подставленного названия. Слаг остаётся в адресе, и по
   * нему форма подставляет название; уезжает же то, что человек подтвердил.
   */
  model: z
    .string()
    .trim()
    .max(120, { message: 'Название модели длиннее 120 символов не поместится' })
    .optional(),
  place: z
    .string()
    .trim()
    .max(80, { message: 'Слишком длинно: уместите в 80 символов' })
    .optional(),
  qty: z.string().trim().max(40, { message: 'Слишком длинно: уместите в 40 символов' }).optional(),
  callTime: z
    .string()
    .trim()
    .max(80, { message: 'Слишком длинно: уместите в 80 символов' })
    .optional(),
  address: z
    .string()
    .trim()
    .max(200, { message: 'Адрес длиннее 200 символов не поместится' })
    .optional(),
  comment: z
    .string()
    .trim()
    .max(2000, { message: 'Комментарий длиннее 2000 символов не поместится' })
    .optional(),
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
  when: z.string().trim().max(80, { message: 'Слишком длинно: уместите в 80 символов' }).optional(),
  consent: consentSchema,
  hp: honeypotSchema,
});

export type ToReminderInput = z.infer<typeof toReminderSchema>;

const managerCommentSchema = z.string().trim().max(2000).nullable().optional();

/** Причина отмены — код справочника, общего с нарядом (ADR-310). */
export const leadCancelReasonSchema = z.enum(CANCEL_REASONS, {
  errorMap: () => ({ message: 'Выберите причину отказа' }),
});

const cancelNoteSchema = z
  .string()
  .trim()
  .max(CANCEL_NOTE_MAX, `Уточнение длиннее ${CANCEL_NOTE_MAX} символов не сохранится`)
  .nullable()
  .optional();

/**
 * Правка заявки в админке: статус, причина отказа и комментарий менеджера,
 * больше ничего. Данные клиента — то, что он прислал; правка их превращает
 * заявку в пересказ.
 *
 * 🔴 Отмена и удаление — разные вещи (ADR-310). Здесь только отмена: заявка
 * остаётся в истории и в счётчиках конверсии, меняется её состояние. Стирает
 * персональные данные `DELETE`, и это отдельное необратимое действие.
 *
 * 🔴 Причина отказа связана со статусом правилом, а не оставлена
 * необязательным полем «на всякий случай» — довод тот же, что в ADR-300 про
 * отказ по отзыву: поле, которое можно не заполнить, не заполняют.
 */
export const leadUpdateSchema = z
  .object({
    status: z
      .enum(leadStatusSchema.options, {
        errorMap: () => ({ message: 'Неизвестный статус заявки' }),
      })
      .optional(),
    cancelReason: leadCancelReasonSchema.optional(),
    cancelNote: cancelNoteSchema,
    managerComment: managerCommentSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Нечего сохранять' });
      return;
    }

    /* 🔴 Отмена без причины запрещена (ADR-310): ради разбора причин отказа
       вкладка и заводится, а «просто отказ» не отвечает ни на один вопрос
       владельца — ни почему ушли, ни что с этим делать. */
    if (value.status === 'rejected' && value.cancelReason === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cancelReason'],
        message: 'Выберите причину отказа',
      });
    }

    /* Причина живёт только вместе с отказом: обращение, вернувшееся в работу,
       не должно тащить объяснение, которое перестало быть правдой. */
    if (value.status !== 'rejected' && value.cancelReason !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cancelReason'],
        message: 'Причина относится только к отказу',
      });
    }

    if (value.cancelReason === undefined && value.cancelNote !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cancelNote'],
        message: 'Уточнение без причины ничего не объясняет',
      });
    }
  });

export type LeadUpdate = z.infer<typeof leadUpdateSchema>;
