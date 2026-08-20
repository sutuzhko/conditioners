import { z } from 'zod';

/**
 * Модель кондиционера в каталоге.
 *
 * Ключевая особенность — произвольный набор характеристик: фиксированного
 * списка полей не существует ни в схеме БД, ни здесь (инвариант 6, ADR-015).
 */

/** Пара «характеристика → значение». Порядок задаёт владелец. */
export const productSpecSchema = z.object({
  k: z.string().trim().min(1),
  v: z.string().trim(),
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
  visible: z.boolean().default(true),
  sort: z.number().int().default(0),
  seoTitle: z.string().nullable().default(null),
  seoDescription: z.string().nullable().default(null),
  photos: z.array(productPhotoSchema).default([]),
  specs: z.array(productSpecSchema).default([]),
});

export type Product = z.infer<typeof productSchema>;

/** Тело создания и правки модели в админке: без служебных полей и фотографий. */
export const productInputSchema = productSchema
  .omit({ id: true, photos: true, specs: true })
  .partial({ slug: true })
  .extend({ specs: z.array(productSpecSchema.omit({ sort: true })).default([]) });

export type ProductInput = z.infer<typeof productInputSchema>;

/**
 * Скидка задаётся конечной ценой и периодом (ADR-011). `salePrice: null`
 * снимает скидку.
 */
export const saleInputSchema = z.object({
  salePrice: z.number().int().positive().nullable(),
  saleFrom: nullableDate,
  saleTo: nullableDate,
  saleLabel: z.string().trim().nullable().default(null),
});

export type SaleInput = z.infer<typeof saleInputSchema>;

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
