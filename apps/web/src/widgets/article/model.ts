import type { Article, ArticleBlock, InlineNode } from '@/entities/article/model';
import type { ButtonLinkHref } from '@/shared/ui';

/**
 * Что витрине нужно от статьи.
 *
 * Не весь `Article`: `body` и SEO-поля листингу не нужны, а `published`
 * — дело страницы, она и отбирает опубликованные (docs/ORCHESTRATION.md,
 * «Блок не ходит в базу»).
 */
export type ArticleTeaser = Pick<
  Article,
  'id' | 'slug' | 'title' | 'category' | 'date' | 'minutes' | 'excerpt' | 'cover'
>;

/**
 * Статья целиком. `body` приходит текстом в мини-формате (PROJECT §2.7), а не
 * разобранным деревом: разбор — дело представления, и фикстура истории тогда
 * выглядит ровно так, как текст в админке.
 */
export type ArticleFull = Pick<Article, 'title' | 'category' | 'date' | 'minutes' | 'cover'> & {
  readonly body: string;
};

/** Ссылка в блоке перехода под статьёй: анкор осмысленный, не «подробнее». */
export interface ArticleLink {
  readonly label: string;
  readonly href: ButtonLinkHref;
}

/** Заголовок тела статьи с проставленным якорем — основа оглавления. */
export interface ArticleHeading {
  readonly id: string;
  readonly level: 2 | 3;
  readonly text: string;
}

/** Блок тела с якорем у заголовка: то же дерево, что отдаёт `parseArticleBody`. */
export type OutlinedBlock =
  | {
      readonly kind: 'heading';
      readonly level: 2 | 3;
      readonly id: string;
      readonly content: readonly InlineNode[];
    }
  | Exclude<ArticleBlock, { kind: 'heading' }>;
