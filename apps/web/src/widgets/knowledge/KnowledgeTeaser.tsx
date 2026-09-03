import Link from 'next/link';

import { ArticleCard } from '@/entities/article/ui';
import type { ArticleTeaser } from '@/entities/article/model';
import { Card, Icon } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';

import { knowledgeContent as t } from './content';
import styles from './KnowledgeTeaser.module.css';

const HEADING_ID = 'knowledge-title';

/**
 * Сколько статей показывает тизер.
 *
 * 🔴 Две, а не три (issue #279). Тизер на 375 занимал 1 735px — два с
 * половиной экрана на одну секцию, — и третья карточка в этой высоте лишняя:
 * полный список живёт на `/knowledge`, и он в индексе. Ограничение
 * принадлежит блоку, а не странице: это свойство краткой витрины.
 */
const TEASER_LIMIT = 2;

export interface KnowledgeTeaserProps {
  /**
   * Статьи в порядке вывода. 🔴 Блок в базу не ходит: опубликованные статьи
   * отбирает и приносит страница (docs/ORCHESTRATION.md, «Блок не ходит в
   * базу»). Пустой список — рабочее состояние: раздел наполняется постепенно.
   */
  articles?: readonly ArticleTeaser[] | undefined;
  /**
   * Адрес статьи по её слагу. Функцией, а не полем в данных: карта URL
   * принадлежит странице (docs/SEO.md §1), а не блоку.
   */
  articleHref: (slug: string) => ButtonLinkHref;
  /** Адрес листинга Базы знаний — по той же причине пропсом. */
  allHref: ButtonLinkHref;
  /** Якорь секции: по нему на неё ведёт навигация в шапке. */
  id?: string | undefined;
}

/**
 * Тизер Базы знаний: две статьи и ссылка на листинг.
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
          <p className={styles.kicker}>{t.kicker}</p>
          <h2 id={HEADING_ID} className={styles.title}>
            {t.title}
          </h2>
          <p className={styles.lead}>{t.lead}</p>
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

        {/* 🔴 Ссылка стоит после карточек, а не в шапке секции: на телефоне
            заголовок с лидом и без неё занимает четверть экрана. На широкой
            ширине сетка возвращает её в правый верхний угол — переносится
            место, а не порядок чтения. Пустой листинг — мёртвая ссылка:
            пока статей нет, её нет тоже. */}
        {articles.length === 0 ? null : (
          <Link href={allHref} className={styles.all}>
            {t.allLink}
            <Icon name="arrow-right" size={16} />
          </Link>
        )}
      </div>
    </section>
  );
}
