import Link from 'next/link';

import { Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { pageSlug } from '@/shared/lib/slug';

import { articleContent as t } from './content';
import type { ArticleTeaser } from './model';
import { ArticleListCard } from './ui/ArticleListCard';
import styles from './ArticleList.module.css';

const HEADING_ID = 'knowledge-title';

/** Фильтр из одной рубрики ничего не фильтрует — тогда его нет вовсе. */
const MIN_CATEGORIES = 2;

export interface ArticleListProps {
  /**
   * Опубликованные статьи в порядке вывода. 🔴 Блок в базу не ходит: отбор и
   * порядок — дело страницы (docs/ORCHESTRATION.md). Пустой список — рабочее
   * состояние: раздел наполняется постепенно.
   */
  articles?: readonly ArticleTeaser[] | undefined;
  /** Слаг выбранной рубрики из адреса; `null` — показаны все статьи. */
  activeCategory?: string | null | undefined;
  /** Адрес листинга с фильтром по рубрике; `null` — адрес без фильтра. */
  categoryHref: (category: string | null) => ButtonLinkHref;
  /** Адрес статьи по её слагу: карта URL принадлежит странице (docs/SEO.md §1). */
  articleHref: (slug: string) => ButtonLinkHref;
}

interface CategoryTab {
  readonly slug: string | null;
  readonly label: string;
  readonly selected: boolean;
}

/**
 * Рубрики в порядке первого появления, то есть от свежей статьи к старой:
 * отдельного поля сортировки у рубрики нет, а алфавит поставил бы вперёд
 * случайную.
 */
function collectCategories(articles: readonly ArticleTeaser[]): readonly string[] {
  const seen = new Map<string, string>();
  for (const article of articles) {
    const label = article.category.trim();
    if (label === '') continue;
    const slug = pageSlug(label);
    if (!seen.has(slug)) seen.set(slug, label);
  }
  return [...seen.values()];
}

/**
 * Листинг Базы знаний.
 *
 * 🔴 Фильтр рубрик — обычные ссылки, а не кнопки с состоянием: отфильтрованный
 * список приходит с сервера готовым и работает без JavaScript (инвариант 1).
 * Робот и человек с выключенными скриптами видят один и тот же раздел.
 */
export function ArticleList({
  articles = [],
  activeCategory = null,
  categoryHref,
  articleHref,
}: ArticleListProps) {
  const categories = collectCategories(articles);
  const active = activeCategory === null || activeCategory === '' ? null : activeCategory;
  const shown =
    active === null ? articles : articles.filter((a) => pageSlug(a.category) === active);

  const tabs: readonly CategoryTab[] = [
    { slug: null, label: t.allCategories, selected: active === null },
    ...categories.map((label) => ({
      slug: pageSlug(label),
      label,
      selected: pageSlug(label) === active,
    })),
  ];

  return (
    <section className={styles.section} aria-labelledby={HEADING_ID}>
      <div className={styles.container}>
        <header className={styles.head}>
          <p className={styles.kicker}>{t.kicker}</p>
          <h1 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h1>
          <p className={styles.lead}>{t.lead}</p>
        </header>

        {categories.length < MIN_CATEGORIES ? null : (
          <nav className={styles.filter} aria-label={t.filterLabel}>
            <ul className={styles.tabs}>
              {tabs.map((tab) => (
                <li key={tab.slug ?? ''}>
                  <Link
                    href={categoryHref(tab.slug)}
                    className={tab.selected ? `${styles.tab} ${styles.selected}` : styles.tab}
                    aria-current={tab.selected ? 'page' : undefined}
                  >
                    {tab.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        {articles.length === 0 ? (
          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{t.emptyTitle}</p>
            <p className={styles.emptyText}>{t.emptyText}</p>
          </Card>
        ) : null}

        {articles.length > 0 && shown.length === 0 ? (
          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{t.emptyFilterTitle}</p>
            <p className={styles.emptyText}>{t.emptyFilterText}</p>
            <Link href={categoryHref(null)} className={styles.emptyLink}>
              {t.emptyFilterLink}
            </Link>
          </Card>
        ) : null}

        {shown.length === 0 ? null : (
          <ul className={styles.grid} aria-label={t.listLabel}>
            {shown.map((article) => (
              <ArticleListCard
                key={article.id}
                article={article}
                href={articleHref(article.slug)}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
