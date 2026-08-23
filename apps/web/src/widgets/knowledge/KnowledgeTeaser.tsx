import Link from 'next/link';

import { Card, Icon } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { knowledgeContent as t } from './content';
import type { ArticleTeaser } from './model';
import { ArticleCard } from './ui/ArticleCard';
import styles from './KnowledgeTeaser.module.css';

const HEADING_ID = 'knowledge-title';

/**
 * Сколько статей показывает тизер. Ограничение принадлежит блоку, а не
 * странице: это свойство краткой витрины — со временем статей станут
 * десятки, и весь список на главной ей не нужен, для него есть листинг.
 */
const TEASER_LIMIT = 3;

export interface KnowledgeTeaserProps {
  /**
   * Статьи в порядке вывода. 🔴 Блок в базу не ходит: опубликованные статьи
   * отбирает и приносит страница (docs/ORCHESTRATION.md, «Блок не ходит в
   * базу»). Пустой список — рабочее состояние: раздел наполняется постепенно.
   */
  articles?: readonly ArticleTeaser[] | undefined;
  /**
   * Адрес статьи по её слагу. Функцией, а не полем в данных: карта URL
   * принадлежит странице (docs/SEO.md §1), а не блоку. Маршрута
   * `/knowledge/[slug]` ещё нет, поэтому адрес собирается объектом —
   * `typedRoutes` проверяет строковые литералы и пропускает `UrlObject`.
   */
  articleHref: (slug: string) => ButtonLinkHref;
  /** Адрес листинга Базы знаний — по той же причине пропсом. */
  allHref: ButtonLinkHref;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

/**
 * Тизер Базы знаний: три-четыре статьи и ссылка на листинг.
 *
 * Серверный компонент: карточки приходят в HTML готовыми и индексируются без
 * JavaScript (инвариант 1). Интерактивности в блоке нет, поэтому нет и
 * `'use client'`.
 */
export function KnowledgeTeaser({
  articles = [],
  articleHref,
  allHref,
  id = 'knowledge',
}: KnowledgeTeaserProps) {
  return (
    <section id={id} className={styles.section} aria-labelledby={HEADING_ID} data-band>
      <div className={styles.container}>
        <header className={styles.head}>
          <div className={styles.intro}>
            <p className={styles.kicker}>{t.kicker}</p>
            <h2 id={HEADING_ID} className={styles.title}>
              {t.title}
            </h2>
            <p className={styles.lead}>{t.lead}</p>
          </div>

          {/* пустой листинг — мёртвая ссылка: пока статей нет, её нет тоже */}
          {articles.length === 0 ? null : (
            <Link href={allHref} className={styles.all}>
              {t.allLink}
              <Icon name="arrow-right" size={16} />
            </Link>
          )}
        </header>

        {articles.length === 0 ? (
          <Card variant="soft" padding="lg" className={styles.empty}>
            <p className={styles.emptyTitle}>{t.emptyTitle}</p>
            <p className={styles.emptyText}>{t.emptyText}</p>
          </Card>
        ) : (
          <ul className={styles.grid} aria-label={t.listLabel}>
            {articles.slice(0, TEASER_LIMIT).map((article) => (
              <ArticleCard key={article.id} article={article} href={articleHref(article.slug)} />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
