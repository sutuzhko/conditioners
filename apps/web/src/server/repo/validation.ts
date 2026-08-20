/**
 * Схемы тел запросов админки.
 *
 * ⚠️ Схемы сущностей по карте владения пишет агент A — `entities/<сущность>/model.ts`.
 * Пока его модулей нет, валидация описана здесь; после сведения этот файл
 * должен реэкспортировать доменные схемы, а не держать свои копии.
 *
 * 🔴 Характеристики товара — произвольный список пар «ключ — значение»
 * (инвариант 6, ADR-015). Никакого фиксированного набора полей.
 */
import { z } from 'zod';

/** Бизнес живёт в Туле: границы периода скидки считаются по местному времени. */
const MSK_OFFSET = '+03:00';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const boundary = (endOfDay: boolean) =>
  z
    .string()
    .trim()
    .nullable()
    .transform((value, ctx) => {
      if (value === null || value === '') return null;

      const parsed = DATE_ONLY.test(value)
        ? new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}${MSK_OFFSET}`)
        : new Date(value);

      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Дата указана в неизвестном формате',
        });
        return z.NEVER;
      }
      return parsed;
    });

const optionalText = z.string().trim().max(300).nullable().optional();

const requiredDate = boundary(false).refine((value): value is Date => value !== null, {
  message: 'Укажите дату',
});

export const specSchema = z.object({
  k: z.string().trim().min(1, 'У характеристики должно быть название').max(120),
  v: z.string().trim().min(1, 'У характеристики должно быть значение').max(300),
});

const productFields = {
  slug: z.string().trim().max(80).optional(),
  badge: z.string().trim().min(1, 'Укажите класс мощности').max(16),
  name: z.string().trim().min(2, 'Название слишком короткое').max(200),
  brand: optionalText,
  sku: optionalText,
  areaMax: z.coerce.number().int().positive('Площадь должна быть больше нуля').max(1000),
  tag: optionalText,
  priceNum: z.coerce.number().int().positive('Цена должна быть больше нуля'),
  link: z.string().trim().max(500).nullable().optional(),
  visible: z.boolean().optional(),
  sort: z.coerce.number().int().min(0).optional(),
  seoTitle: optionalText,
  seoDescription: z.string().trim().max(500).nullable().optional(),
  specs: z.array(specSchema).max(50).optional(),
};

export const productCreateSchema = z.object(productFields).strict();
export const productUpdateSchema = productCreateSchema;
export const productPatchSchema = z.object(productFields).strict().partial();

export const saleSchema = z
  .object({
    salePrice: z.coerce.number().int().positive().nullable(),
    saleFrom: boundary(false).optional(),
    saleTo: boundary(true).optional(),
    saleLabel: optionalText,
  })
  .strict();

export const photoPatchSchema = z
  .object({
    alt: optionalText,
    isMain: z.boolean().optional(),
    sort: z.coerce.number().int().min(0).optional(),
  })
  .strict();

export const priceRowSchema = z.object({
  cls: z.string().trim().min(1).max(8),
  power: z.string().trim().min(1).max(40),
  area: z.string().trim().min(1).max(40),
  price: z.coerce.number().int().min(0),
  term: z.string().trim().min(1).max(60),
});

export const extrasSchema = z
  .object({
    trassaPerM: z.coerce.number().int().min(0),
    shtrobPerM: z.coerce.number().int().min(0),
    heightWorks: z.coerce.number().int().min(0),
  })
  .strict();

export const pricesUpdateSchema = z
  .object({
    prices: z.array(priceRowSchema).min(1, 'Нужна хотя бы одна строка прайса'),
    extras: extrasSchema,
  })
  .strict();

const articleFields = {
  slug: z.string().trim().max(80).optional(),
  title: z.string().trim().min(3, 'Заголовок слишком короткий').max(200),
  category: z.string().trim().min(1, 'Укажите рубрику').max(80),
  date: requiredDate,
  minutes: z.coerce.number().int().min(1).max(120),
  excerpt: z.string().trim().min(10, 'Анонс слишком короткий').max(500),
  body: z.string().trim().min(20, 'Текст статьи слишком короткий'),
  published: z.boolean().optional(),
  seoTitle: optionalText,
  seoDescription: z.string().trim().max(500).nullable().optional(),
};

export const articleCreateSchema = z.object(articleFields).strict();
export const articleUpdateSchema = articleCreateSchema;
export const articlePatchSchema = z.object(articleFields).strict().partial();

/** 🔴 Модератор меняет только статус: поля `text` в схеме нет и быть не может. */
export const reviewStatusSchema = z
  .object({
    status: z.enum(['approved', 'rejected', 'archived', 'pending'], {
      errorMap: () => ({ message: 'Неизвестный статус отзыва' }),
    }),
  })
  .strict();

export const leadPatchSchema = z
  .object({
    status: z.enum(['new', 'in_progress', 'done', 'rejected'], {
      errorMap: () => ({ message: 'Неизвестный статус заявки' }),
    }),
    managerComment: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Нечего сохранять');

export const revalidateSchema = z
  .object({
    paths: z.array(z.string().trim().startsWith('/', 'Путь начинается со слэша')).min(1).max(50),
    scope: z.enum(['page', 'layout']).optional(),
  })
  .strict();

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductPatchInput = z.infer<typeof productPatchSchema>;
export type SaleInput = z.infer<typeof saleSchema>;
export type PhotoPatchInput = z.infer<typeof photoPatchSchema>;
export type PricesUpdateInput = z.infer<typeof pricesUpdateSchema>;
export type ArticleCreateInput = z.infer<typeof articleCreateSchema>;
export type ArticlePatchInput = z.infer<typeof articlePatchSchema>;
export type LeadPatchInput = z.infer<typeof leadPatchSchema>;
