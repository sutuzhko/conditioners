import { z } from 'zod';

import { moscowDate } from '@/shared/lib/zod';
import { SLUG_MAX_LENGTH } from '@/shared/lib/slug';

/**
 * Статья Базы знаний. `body` — плоский текст со своим мини-форматом разметки
 * (ADR-014): владелец правит его в обычном textarea, без визуального редактора.
 */
export const articleSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  date: z.coerce.date(),
  minutes: z.number().int().positive(),
  cover: z.string().nullable().default(null),
  excerpt: z.string().trim(),
  body: z.string(),
  published: z.boolean().default(false),
  seoTitle: z.string().nullable().default(null),
  seoDescription: z.string().nullable().default(null),
  updatedAt: z.coerce.date(),
});

export type Article = z.infer<typeof articleSchema>;

/**
 * Что витрине нужно от статьи: карточка в тизере на главной и карточка в
 * листинге `/knowledge` рисуют один и тот же набор полей.
 *
 * Тип живёт здесь, а не в двух виджетах: правило слоёв запрещает связи вбок,
 * и пока каждый описывал набор сам, две копии `Pick` расходились молча.
 * `body`, `published` и SEO-поля витрине не нужны — их читает страница статьи.
 */
export type ArticleTeaser = Pick<
  Article,
  'id' | 'slug' | 'title' | 'category' | 'date' | 'minutes' | 'excerpt' | 'cover'
>;

const optionalText = z.string().trim().max(300).nullable().default(null);

/**
 * Тело создания и правки статьи в админке. Схема строгая: незнакомое поле —
 * опечатка формы, и молчаливая потеря текста статьи хуже, чем 400.
 *
 * Обложка задаётся отдельной ручкой `POST /api/admin/articles/{id}/cover`:
 * это файл, а не поле формы.
 */
export const articleInputSchema = articleSchema
  .omit({ id: true, updatedAt: true, cover: true })
  .extend({
    slug: z.string().trim().max(SLUG_MAX_LENGTH).optional(),
    title: z.string().trim().min(3, 'Заголовок слишком короткий').max(200),
    category: z.string().trim().min(1, 'Укажите рубрику').max(80),
    // дата публикации — календарный день по времени Тулы
    date: moscowDate('start').refine((value): value is Date => value !== null, {
      message: 'Укажите дату',
    }),
    minutes: z.coerce.number().int().min(1).max(120),
    excerpt: z.string().trim().min(10, 'Анонс слишком короткий').max(500),
    body: z.string().trim().min(20, 'Текст статьи слишком короткий'),
    published: z.boolean().default(false),
    seoTitle: optionalText,
    seoDescription: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export type ArticleInput = z.infer<typeof articleInputSchema>;

/** PATCH правит часть статьи: не присланное поле остаётся прежним. */
export const articlePatchSchema = articleInputSchema.partial();

export type ArticlePatch = z.infer<typeof articlePatchSchema>;

/** Кусок текста внутри блока. Единственное инлайн-оформление — `**жирный**`. */
export type InlineNode =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'strong'; readonly text: string };

/**
 * Блок разметки статьи. Дерево, а не строка HTML: рендерит UI-слой, поэтому
 * в домене нет ни одного тега и нет риска подставить в вёрстку чужую разметку.
 */
export type ArticleBlock =
  | { readonly kind: 'heading'; readonly level: 2 | 3; readonly content: readonly InlineNode[] }
  | { readonly kind: 'paragraph'; readonly content: readonly InlineNode[] }
  | { readonly kind: 'list'; readonly items: readonly (readonly InlineNode[])[] }
  | { readonly kind: 'callout'; readonly content: readonly InlineNode[] };
