import { z } from 'zod';

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

/** Тело создания и правки статьи в админке. */
export const articleInputSchema = articleSchema
  .omit({ id: true, updatedAt: true })
  .partial({ slug: true });

export type ArticleInput = z.infer<typeof articleInputSchema>;

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
