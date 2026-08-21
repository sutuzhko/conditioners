import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { parseArticleBody } from '@/entities/article/lib/parseArticleBody';
import { ArrowIcon, Badge, ButtonLink } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { formatDate, formatDateIso } from '@/shared/lib/format';

import { ArticleBody } from './ArticleBody';
import { ArticleToc } from './ArticleToc';
import { articleContent as t } from './content';
import type { ArticleFull, ArticleLink } from './model';
import { articleOutline } from './outline';
import styles from './ArticleView.module.css';

/**
 * Обложка хранится с длинной стороной 1200px — ровно столько и нужно
 * широкой картинке статьи. Пропорция 16:7 — из макета.
 */
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 525;
const COVER_SIZES = '(max-width: 767px) 100vw, 680px';

/**
 * Оглавление из двух пунктов не помогает ориентироваться, а место занимает.
 * Короткая заметка обходится без него, длинная статья — нет (docs/SEO.md §7).
 */
const MIN_TOC_HEADINGS = 3;

export interface ArticleViewProps {
  article: ArticleFull;
  /**
   * Хлебные крошки — слотом, а не своей вёрсткой: след и его разметка живут
   * в отдельном виджете (владение агента SEO), а импортировать соседний
   * виджет нельзя — правило зависимостей запрещает связи вбок.
   */
  breadcrumbs?: ReactNode | undefined;
  /** Адреса приходят пропсами: карта URL принадлежит странице (docs/SEO.md §1). */
  listHref: ButtonLinkHref;
  /** Форма заявки — основная кнопка блока перехода под текстом. */
  leadHref: ButtonLinkHref;
  /** Коммерческие страницы, куда статья ведёт дальше. Анкоры осмысленные. */
  links?: readonly ArticleLink[] | undefined;
}

/**
 * Страница статьи целиком.
 *
 * Серверный компонент: текст приходит в HTML готовым и индексируется без
 * JavaScript (инвариант 1) — статьи ради поиска и существуют.
 */
export function ArticleView({
  article,
  breadcrumbs,
  listHref,
  leadHref,
  links = [],
}: ArticleViewProps) {
  const blocks = parseArticleBody(article.body);
  const { headings } = articleOutline(blocks);
  const category = article.category.trim();
  const cover = article.cover === null ? '' : article.cover.trim();

  return (
    <article className={styles.article}>
      {breadcrumbs === undefined ? null : <div className={styles.crumbs}>{breadcrumbs}</div>}

      <header className={styles.head}>
        <p className={styles.meta}>
          {category === '' ? null : (
            <Badge variant="accent" size="sm" mono>
              <span className="srOnly">{t.categoryLabel} </span>
              {category}
            </Badge>
          )}
          <span className={styles.dates}>
            <span className="srOnly">{t.dateLabel} </span>
            <time dateTime={formatDateIso(article.date)}>{formatDate(article.date)}</time>
            <span aria-hidden="true"> · </span>
            <span>{t.minutesLabel(article.minutes)}</span>
          </span>
        </p>

        <h1 className={styles.title}>{article.title}</h1>
      </header>

      {/* обложку владелец загружает не всегда — статья обязана жить и без неё */}
      {cover === '' ? null : (
        <Image
          className={styles.cover}
          src={cover}
          alt={t.coverAlt(article.title)}
          width={COVER_WIDTH}
          height={COVER_HEIGHT}
          sizes={COVER_SIZES}
          priority
        />
      )}

      {headings.length < MIN_TOC_HEADINGS ? null : <ArticleToc headings={headings} />}

      <ArticleBody blocks={blocks} />

      <aside className={styles.cta}>
        <div className={styles.ctaText}>
          <p className={styles.ctaTitle}>{t.ctaTitle}</p>
          <p className={styles.ctaLead}>{t.ctaText}</p>
        </div>
        <div className={styles.ctaActions}>
          <ButtonLink href={leadHref} variant="accent" size="lg">
            {t.ctaLead}
          </ButtonLink>
          {links.length === 0 ? null : (
            <ul className={styles.ctaLinks}>
              {links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={styles.ctaLink}>
                    {link.label}
                    <ArrowIcon size={15} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <p className={styles.back}>
        <Link href={listHref} className={styles.backLink}>
          {t.backToList}
        </Link>
      </p>
    </article>
  );
}
