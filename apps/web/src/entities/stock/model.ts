import { z } from 'zod';

/**
 * Склад: что лежит, где лежит и куда делось.
 *
 * Требования — docs/CRM.md §11, решения — ADR-111 и ADR-134, контракт
 * маршрутов — docs/API.md §14.
 *
 * 🔴 Остаток — сумма движений, а не поле. Ни одна схема здесь не позволяет
 * записать остаток напрямую: правка руками существует, но как движение
 * «инвентаризация» с обязательным основанием. Иначе вопрос «куда делись
 * тридцать метров трассы» остаётся без ответа, а склад превращается в число,
 * которое все правят по памяти.
 */

/* Набор единиц задаёт код, номенклатуру — владелец из админки (инвариант 8). */
export const stockUnitSchema = z.enum([
  'piece',
  'meter',
  'kilogram',
  'liter',
  'pair',
  'pack',
  'coil',
  'roll',
  'cylinder',
]);
export type StockUnit = z.infer<typeof stockUnitSchema>;
export const STOCK_UNITS: readonly StockUnit[] = stockUnitSchema.options;

export const stockZoneKindSchema = z.enum(['warehouse', 'van']);
export type StockZoneKind = z.infer<typeof stockZoneKindSchema>;
export const STOCK_ZONE_KINDS: readonly StockZoneKind[] = stockZoneKindSchema.options;

export const stockMoveKindSchema = z.enum(['income', 'transfer', 'consume', 'return', 'count']);
export type StockMoveKind = z.infer<typeof stockMoveKindSchema>;
export const STOCK_MOVE_KINDS: readonly StockMoveKind[] = stockMoveKindSchema.options;

/** Значение из `select` — строка. Принять её за единицу без проверки нельзя. */
export function isStockUnit(value: string): value is StockUnit {
  return STOCK_UNITS.some((unit) => unit === value);
}

export function isStockMoveKind(value: string): value is StockMoveKind {
  return STOCK_MOVE_KINDS.some((kind) => kind === value);
}

/**
 * Количество приходит из формы строкой. Человек пишет «1,5» и «12 000» — так
 * пишут по-русски, и отвергать такой ввод значит спорить с клавиатурой, а не
 * защищать данные.
 */
function toQuantity(value: unknown): unknown {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return value;

  const normalized = value.trim().replace(/\s/gu, '').replace(',', '.');
  if (normalized === '') return undefined;

  const parsed = Number(normalized);
  /* Мусор возвращается как есть: пусть о нём скажет Zod, а не `NaN`. */
  return Number.isNaN(parsed) ? value : parsed;
}

/* Три знака после запятой — предел колонки в базе. Больше склад не хранит,
   и обещать точность, которой нет, нельзя. */
const STEP = 1000;
const QTY_MAX = 1_000_000;

function hasThreeDecimals(value: number): boolean {
  return (
    Number.isInteger(Math.round(value * STEP)) &&
    Math.abs(value * STEP - Math.round(value * STEP)) < 1e-6
  );
}

/** Количество движения: строго больше нуля, направление задают зоны. */
export const quantitySchema = z.preprocess(
  toQuantity,
  z
    .number({ required_error: 'Укажите количество', invalid_type_error: 'Количество — число' })
    .positive({ message: 'Количество больше нуля' })
    .max(QTY_MAX, { message: 'Слишком большое количество' })
    .refine(hasThreeDecimals, { message: 'Не больше трёх знаков после запятой' }),
);

/**
 * Поправка инвентаризации: и добавляет, и убавляет, поэтому знак свой. Ноль
 * запрещён — движение, ничего не меняющее, только засоряет журнал.
 */
export const deltaSchema = z.preprocess(
  toQuantity,
  z
    .number({ required_error: 'Укажите поправку', invalid_type_error: 'Поправка — число' })
    .refine((value) => value !== 0, { message: 'Поправка не может быть нулевой' })
    .refine((value) => Math.abs(value) <= QTY_MAX, { message: 'Слишком большая поправка' })
    .refine(hasThreeDecimals, { message: 'Не больше трёх знаков после запятой' }),
);

/** Порог «пора заказывать». Ноль — за позицией не следим. */
export const thresholdSchema = z.preprocess(
  (value) => (value === '' || value === null || value === undefined ? 0 : toQuantity(value)),
  z
    .number({ invalid_type_error: 'Порог — число' })
    .min(0, { message: 'Порог не может быть отрицательным' })
    .max(QTY_MAX, { message: 'Слишком большой порог' })
    .refine(hasThreeDecimals, { message: 'Не больше трёх знаков после запятой' }),
);

/** Пустая строка в необязательном поле — это «не заполнено», а не пустое значение. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, { message })
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .default(null);

const idSchema = z.string().trim().min(1);
const optionalId = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .default(null);

// ---------- Позиция справочника ----------

export const stockItemCreateSchema = z.object({
  name: z
    .string({ required_error: 'Укажите название позиции' })
    .trim()
    .min(1, { message: 'Укажите название позиции' })
    .max(120, { message: 'Название длиннее 120 символов' }),
  group: optionalText(60, 'Название группы длиннее 60 символов'),
  unit: stockUnitSchema,
  minQty: thresholdSchema,
  /* Техника ссылается на модель каталога, расходники — нет. */
  productId: optionalId,
  note: optionalText(500, 'Заметка длиннее 500 символов'),
});
export type StockItemCreate = z.infer<typeof stockItemCreateSchema>;

export const stockItemUpdateSchema = stockItemCreateSchema.extend({
  /* Позиция не удаляется, а сдаётся в архив: удаление унесло бы историю. */
  archived: z.boolean().default(false),
});
export type StockItemUpdate = z.infer<typeof stockItemUpdateSchema>;

// ---------- Зона хранения ----------

/**
 * 🔴 Машина принадлежит человеку, гараж — никому. Зона-машина без хозяина
 * бессмысленна: монтажник видит свою по этой самой связи, а не по названию.
 */
export const stockZoneCreateSchema = z
  .object({
    kind: stockZoneKindSchema,
    name: z
      .string({ required_error: 'Укажите название зоны' })
      .trim()
      .min(1, { message: 'Укажите название зоны' })
      .max(80, { message: 'Название длиннее 80 символов' }),
    userId: optionalId,
    sort: z.coerce.number().int().min(0).max(9999).default(0),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'van' && value.userId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['userId'],
        message: 'Выберите, чья это машина',
      });
    }

    if (value.kind === 'warehouse' && value.userId !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['userId'],
        message: 'Склад не принадлежит человеку',
      });
    }
  });
export type StockZoneCreate = z.infer<typeof stockZoneCreateSchema>;

export const stockZoneUpdateSchema = z
  .object({
    kind: stockZoneKindSchema,
    name: z
      .string({ required_error: 'Укажите название зоны' })
      .trim()
      .min(1, { message: 'Укажите название зоны' })
      .max(80, { message: 'Название длиннее 80 символов' }),
    userId: optionalId,
    sort: z.coerce.number().int().min(0).max(9999).default(0),
    archived: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.kind === 'van' && value.userId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['userId'],
        message: 'Выберите, чья это машина',
      });
    }

    if (value.kind === 'warehouse' && value.userId !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['userId'],
        message: 'Склад не принадлежит человеку',
      });
    }
  });
export type StockZoneUpdate = z.infer<typeof stockZoneUpdateSchema>;

// ---------- Движение ----------

/**
 * Пять видов движения и ничего сверх (CRM.md §11.5). Каждый вид требует
 * своего набора полей, поэтому схема — размеченное объединение, а не один
 * объект с десятком необязательных ключей: «приход, у которого зачем-то есть
 * наряд» не должен даже разбираться.
 *
 * 🔴 Серийные номера — свободный текст, как их пишет человек. Поштучного
 * учёта экземпляров в первой версии нет: он тянет за собой партии и
 * резервирование, а они отложены осознанно (ADR-134).
 */
const serials = optionalText(500, 'Серийные номера длиннее 500 символов');
const reason = optionalText(300, 'Основание длиннее 300 символов');

/* Проверка «из зоны в ту же зону» висит на объединении, а не на ветке:
   `discriminatedUnion` принимает только объекты, и ветка с `superRefine`
   перестаёт ею быть. */
export const stockMovementCreateSchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('income'),
      itemId: idSchema,
      qty: quantitySchema,
      toZoneId: idSchema,
      serials,
      reason,
    }),
    z.object({
      kind: z.literal('transfer'),
      itemId: idSchema,
      qty: quantitySchema,
      fromZoneId: idSchema,
      toZoneId: idSchema,
      reason,
    }),
    z.object({
      kind: z.literal('consume'),
      itemId: idSchema,
      qty: quantitySchema,
      fromZoneId: idSchema,
      orderId: idSchema,
      serials,
    }),
    z.object({
      kind: z.literal('return'),
      itemId: idSchema,
      qty: quantitySchema,
      orderId: idSchema,
      toZoneId: idSchema,
      reason,
    }),
    z.object({
      kind: z.literal('count'),
      itemId: idSchema,
      /* Поправка со знаком: инвентаризация и добавляет, и убавляет. */
      qty: deltaSchema,
      toZoneId: idSchema,
      /* 🔴 Основание обязательно — см. шапку файла. */
      reason: z
        .string({ required_error: 'Инвентаризация без основания не проводится' })
        .trim()
        .min(1, { message: 'Инвентаризация без основания не проводится' })
        .max(300, { message: 'Основание длиннее 300 символов' }),
    }),
  ])
  .superRefine((value, ctx) => {
    if (value.kind === 'transfer' && value.fromZoneId === value.toZoneId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['toZoneId'],
        message: 'Переместить можно только в другую зону',
      });
    }
  });
export type StockMovementCreate = z.infer<typeof stockMovementCreateSchema>;

// ---------- Представления ----------

export type StockZoneCard = {
  readonly id: string;
  readonly kind: StockZoneKind;
  readonly name: string;
  /** Чья машина: имя человека, а не логин. `null` у склада. */
  readonly userId: string | null;
  readonly userName: string | null;
  readonly sort: number;
  readonly archived: boolean;
};

export type StockItemProduct = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

/**
 * Позиция с остатком по зонам.
 *
 * 🔴 `minQty` и `low` — владельческие ключи: порог заказа говорит о закупочных
 * привычках, и монтажнику он не приходит вовсе (ADR-134). Ключ отсутствует, а
 * не приходит пустым: `null` — это «порога нет», и путать эти два состояния
 * нельзя.
 */
export type StockItemCard = {
  readonly id: string;
  readonly name: string;
  readonly group: string | null;
  readonly unit: StockUnit;
  readonly note: string | null;
  readonly archived: boolean;
  readonly product: StockItemProduct | null;
  /** Остаток по зонам: ключ — `StockZoneCard.id`. Нулевые зоны не опускаются. */
  readonly byZone: Readonly<Record<string, number>>;
  readonly total: number;
  readonly minQty?: number;
  readonly low?: boolean;
};

export type StockMovementOrder = {
  readonly id: string;
  readonly number: number;
};

export type StockMovementCard = {
  readonly id: string;
  readonly kind: StockMoveKind;
  readonly qty: number;
  readonly item: {
    readonly id: string;
    readonly name: string;
    readonly unit: StockUnit;
  };
  readonly fromZone: { readonly id: string; readonly name: string } | null;
  readonly toZone: { readonly id: string; readonly name: string } | null;
  readonly order: StockMovementOrder | null;
  readonly serials: string | null;
  readonly reason: string | null;
  /** Кто провёл движение. `null` — автор удалён. */
  readonly authorName: string | null;
  readonly createdAt: string;
};

/** Остатки: таблица «позиция × зона» приходит одним ответом (CRM.md §11.3). */
export type StockOverview = {
  readonly zones: readonly StockZoneCard[];
  readonly items: readonly StockItemCard[];
  readonly groups: readonly string[];
  readonly total: number;
  readonly page: number;
  readonly pages: number;
  /** Сколько позиций опустилось ниже порога. Ключ владельческий. */
  readonly lowCount?: number;
};

/** Позиция с её журналом: то, что открывают из таблицы остатков. */
export type StockItemDetails = {
  readonly item: StockItemCard;
  readonly movements: readonly StockMovementCard[];
};

/** Расход наряда: что списали на эту работу. */
export type OrderConsumption = {
  readonly items: readonly StockMovementCard[];
};

/**
 * Списание по наряду: несколько позиций одной формой.
 *
 * Наряд приходит адресом маршрута, а не телом: списывают, открыв наряд, и
 * второй источник его номера означал бы, что они когда-нибудь разойдутся.
 *
 * Схема живёт здесь, а не в репозитории: правила ввода одни и для формы
 * закрытия наряда, и для сервера, и вторая их копия разошлась бы с первой на
 * первой же правке.
 */
export const orderConsumeSchema = z.object({
  lines: z
    .array(
      z.object({
        itemId: z.string().trim().min(1, { message: 'Выберите позицию' }),
        qty: quantitySchema,
        fromZoneId: z.string().trim().min(1, { message: 'Выберите, откуда списываем' }),
        serials,
      }),
    )
    .min(1, { message: 'Укажите, что списать' }),
});
export type OrderConsume = z.infer<typeof orderConsumeSchema>;
