import { pageSlug } from '@/shared/lib/slug';
import { pageWindow, type Page } from '@/shared/lib/paging';

import type { ArticleTeaser } from './model';

/**
 * Сколько статей показывает одна страница листинга.
 *
 * Девять — три ряда по три на десктопе и ровный хвост на планшете. Число
 * своё, а не `ADMIN_PAGE_SIZE`: восемь записей — шаг списков панели, где
 * строка занимает одну линию, а здесь строка это карточка.
 */
export const ARTICLES_PAGE_SIZE = 9;

/** Рубрика: подпись, как её написал владелец, и слаг для адреса. */
export interface ArticleCategory {
  readonly slug: string;
  readonly label: string;
}

export interface ArticleSelection {
  /** Рубрики всех статей раздела — не только показанной страницы. */
  readonly categories: readonly ArticleCategory[];
  /** Отобранная рубрикой и разбитая на страницы выдача. */
  readonly page: Page<ArticleTeaser>;
  /** Сколько статей в разделе всего — до отбора рубрикой. */
  readonly published: number;
}

/**
 * Рубрики в порядке первого появления, то есть от свежей статьи к старой:
 * отдельного поля сортировки у рубрики нет, а алфавит поставил бы вперёд
 * случайную.
 */
function collectCategories(articles: readonly ArticleTeaser[]): readonly ArticleCategory[] {
  const seen = new Map<string, ArticleCategory>();

  for (const article of articles) {
    const label = article.category.trim();
    if (label === '') continue;
    const slug = pageSlug(label);
    if (!seen.has(slug)) seen.set(slug, { slug, label });
  }

  return [...seen.values()];
}

/**
 * Что показать на листинге Базы знаний: рубрики, отобранная выдача и её
 * разбивка на страницы.
 *
 * 🔴 Функция чистая и живёт отдельно от компонента, потому что считает не
 * только он: страница берёт отсюда номер реально показанной страницы для
 * каноникала — `?page=99` прижимается к последней, и обещать роботу
 * несуществующий адрес нельзя (docs/SEO.md §5). Разойдись эти два счёта, и
 * каноникал стал бы указывать на пустую выдачу.
 */
export function selectArticles({
  articles,
  category = null,
  page = 1,
  size = ARTICLES_PAGE_SIZE,
}: {
  readonly articles: readonly ArticleTeaser[];
  readonly category?: string | null | undefined;
  readonly page?: number | undefined;
  readonly size?: number | undefined;
}): ArticleSelection {
  const active = category === null || category === '' ? null : category;
  const filtered =
    active === null ? articles : articles.filter((item) => pageSlug(item.category) === active);

  const window = pageWindow(filtered.length, page, size);

  return {
    categories: collectCategories(articles),
    published: articles.length,
    page: {
      items: filtered.slice(window.skip, window.skip + window.take),
      total: filtered.length,
      page: window.page,
      pages: window.pages,
    },
  };
}
