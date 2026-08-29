import { z } from 'zod';

import { SLUG_MAX_LENGTH } from '@/shared/lib/slug';

/**
 * Модель кондиционера в каталоге.
 *
 * Ключевая особенность — произвольный набор характеристик: фиксированного
 * списка полей не существует ни в схеме БД, ни здесь (инвариант 6, ADR-015).
 */

/** Пара «характеристика → значение». Порядок задаёт владелец. */
export const productSpecSchema = z.object({
  k: z.string().trim().min(1, 'У характеристики должно быть название').max(120),
  v: z.string().trim().min(1, 'У характеристики должно быть значение').max(300),
  sort: z.number().int().default(0),
});

export type ProductSpec = z.infer<typeof productSpecSchema>;

export const productPhotoSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  alt: z.string().nullable().default(null),
  isMain: z.boolean().default(false),
  sort: z.number().int().default(0),
});

export type ProductPhoto = z.infer<typeof productPhotoSchema>;

/**
 * Период скидки хранится как дата: пустая граница означает «без ограничения».
 * Значения приходят и из Prisma (`Date`), и из JSON (строка), поэтому приведение.
 */
const nullableDate = z.coerce.date().nullable().default(null);

export const productSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  badge: z.string().trim().min(1),
  name: z.string().trim().min(1),
  brand: z.string().nullable().default(null),
  sku: z.string().nullable().default(null),
  areaMax: z.number().int().positive(),
  tag: z.string().nullable().default(null),
  priceNum: z.number().int().nonnegative(),
  salePrice: z.number().int().nonnegative().nullable().default(null),
  saleFrom: nullableDate,
  saleTo: nullableDate,
  saleLabel: z.string().nullable().default(null),
  link: z.string().nullable().default(null),
  /** «В продаже»: модель есть в каталоге и её можно заказать. */
  visible: z.boolean().default(true),
  /** «Вынести на главную»: витрина лендинга — выбор владельца, а не весь ассортимент (ADR-109). */
  featured: z.boolean().default(false),
  sort: z.number().int().default(0),
  seoTitle: z.string().nullable().default(null),
  seoDescription: z.string().nullable().default(null),
  photos: z.array(productPhotoSchema).default([]),
  specs: z.array(productSpecSchema).default([]),
});

export type Product = z.infer<typeof productSchema>;

/** Строка, которую можно не заполнять; пустое значение хранится как NULL. */
/* Экспортируется ради `sale.ts`: правило одно на весь домен товара, а
   вынесенная схема скидки не должна заводить своё. */
export const optionalText = z.string().trim().max(300).nullable().default(null);

/**
 * Тело создания и правки модели в админке.
 *
 * Скидки здесь нет сознательно: её задаёт отдельная ручка
 * `PATCH /api/admin/models/{id}/sale` (docs/API.md §3), и принимать конечную
 * цену ещё и здесь значило бы иметь два места, где рождается перечёркнутая
 * цена. Схема строгая: незнакомое поле — это опечатка формы, и молча терять
 * его хуже, чем ответить 400.
 *
 * Числа приводятся из строк: форма админки отдаёт значения полей текстом.
 */
export const productInputSchema = productSchema
  .omit({
    id: true,
    photos: true,
    specs: true,
    salePrice: true,
    saleFrom: true,
    saleTo: true,
    saleLabel: true,
  })
  .extend({
    slug: z.string().trim().max(SLUG_MAX_LENGTH).optional(),
    badge: z.string().trim().min(1, 'Укажите класс мощности').max(16),
    name: z.string().trim().min(2, 'Название слишком короткое').max(200),
    brand: optionalText,
    sku: optionalText,
    areaMax: z.coerce.number().int().positive('Площадь должна быть больше нуля').max(1000),
    tag: optionalText,
    priceNum: z.coerce.number().int().positive('Цена должна быть больше нуля'),
    link: z.string().trim().max(500).nullable().default(null),
    /**
     * 🔴 Без значения по умолчанию, в отличие от `visible`: не присланное поле
     * означает «оставить как есть». Редактор, который про витрину не знает,
     * сохранением карточки не имеет права снять модель с главной — молча
     * опустевшая витрина ровно тот отказ, от которого ADR-109 защищался
     * переносом существующих моделей в `featured` миграцией.
     */
    featured: z.boolean().optional(),
    sort: z.coerce.number().int().min(0).default(0),
    seoTitle: optionalText,
    seoDescription: z.string().trim().max(500).nullable().default(null),
    specs: z
      .array(productSpecSchema.omit({ sort: true }))
      .max(50)
      .default([]),
  })
  .strict();

export type ProductInput = z.infer<typeof productInputSchema>;

/** PATCH правит часть карточки: не присланное поле остаётся прежним. */
export const productPatchSchema = productInputSchema.partial();

export type ProductPatch = z.infer<typeof productPatchSchema>;

/** Правка фотографии: подпись, признак главной и порядок. Файл заменяется загрузкой новой. */
export const photoUpdateSchema = z
  .object({
    alt: optionalText,
    isMain: z.boolean().optional(),
    sort: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export type PhotoUpdate = z.infer<typeof photoUpdateSchema>;

/** Действующая цена товара — единственный источник правды о скидке. */
export type ActivePrice = {
  /** Цена, по которой товар продаётся сейчас. */
  readonly currentPrice: number;
  /** Перечёркнутая цена. `null`, когда скидки нет: рисовать её нечем. */
  readonly oldPrice: number | null;
  readonly discountPercent: number | null;
  readonly saleActive: boolean;
  /** Подпись владельца («Осенняя цена»); `null` — рисуется вычисленный процент. */
  readonly saleLabel: string | null;
  /** Для `priceValidUntil` в разметке `Offer`. */
  readonly saleTo: Date | null;
};

/** Значение «Офис» в подборе по площади — из PROJECT §2.3. */
export const OFFICE_PLACE_TYPE = 'Офис';
