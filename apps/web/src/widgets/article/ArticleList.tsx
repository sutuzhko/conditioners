import Link from 'next/link';

import { ArticleCard } from '@/entities/article/ui';
import { Card, Pager } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { articleContent as t } from './content';
import { selectArticles } from './lib';
import type { ArticleTeaser } from './model';
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
  /** Номер страницы из адреса, считая с единицы. */
  activePage?: number | undefined;
  /** Адрес листинга с фильтром по рубрике; `null` — адрес без фильтра. */
  categoryHref: (category: string | null) => ButtonLinkHref;
  /** Адрес статьи по её слагу: карта URL принадлежит странице (docs/SEO.md §1). */
  articleHref: (slug: string) => ButtonLinkHref;
  /** Путь листинга — по нему разбивка собирает адреса соседних страниц. */
  basePath: string;
  /** Что сохраняется при переходе по страницам: выбранная рубрика. */
  pagerQuery?: Readonly<Record<string, string>> | undefined;
}

/**
 * Листинг Базы знаний.
 *
 * 🔴 И фильтр рубрик, и разбивка на страницы — обычные ссылки, а не состояние
 * на клиенте: отфильтрованный список приходит с сервера готовым и работает
 * без JavaScript (инвариант 1). Робот и человек с выключенными скриптами
 * видят один и тот же раздел.
 */
export function ArticleList({
  articles = [],
  activeCategory = null,
  activePage = 1,
  categoryHref,
  articleHref,
  basePath,
  pagerQuery,
}: ArticleListProps) {
  const active = activeCategory === null || activeCategory === '' ? null : activeCategory;
  const { categories, page, published } = selectArticles({
    articles,
    category: active,
    page: activePage,
  });

  const tabs = [
    { slug: null, label: t.allCategories, selected: active === null },
    ...categories.map((category) => ({
      slug: category.slug,
      label: category.label,
      selected: category.slug === active,
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

        {published === 0 ? (
          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{t.emptyTitle}</p>
            <p className={styles.emptyText}>{t.emptyText}</p>
          </Card>
        ) : null}

        {published > 0 && page.total === 0 ? (
          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{t.emptyFilterTitle}</p>
            <p className={styles.emptyText}>{t.emptyFilterText}</p>
            <Link href={categoryHref(null)} className={styles.emptyLink}>
              {t.emptyFilterLink}
            </Link>
          </Card>
        ) : null}

        {page.items.length === 0 ? null : (
          <ul className={styles.grid} aria-label={t.listLabel}>
            {page.items.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                href={articleHref(article.slug)}
                headingLevel={2}
              />
            ))}
          </ul>
        )}

        {/* Разбивка ссылками: страница остаётся в адресе, её можно сохранить
            и прислать, и она не стоит ни килобайта в бюджете JS. */}
        <div className={styles.pager}>
          <Pager
            page={page.page}
            pages={page.pages}
            basePath={basePath}
            query={pagerQuery}
            label={t.pagerLabel}
            prevLabel={t.pagerPrev}
            nextLabel={t.pagerNext}
            position={t.pagerPosition}
          />
        </div>
      </div>
    </section>
  );
}
