import Image from 'next/image';
import Link from 'next/link';

import { ArrowIcon, Badge, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { formatDate, formatDateIso } from '@/shared/lib/format';

import { articleContent as t } from '../content';
import type { ArticleTeaser } from '../model';
import styles from './ArticleListCard.module.css';

/**
 * Обложка хранится с длинной стороной 1200px, витрине столько не нужно:
 * 480×270 (16:9) покрывает карточку с запасом на ретину, а `sizes` даёт
 * браузеру выбрать вариант поменьше.
 */
const COVER_WIDTH = 480;
const COVER_HEIGHT = 270;
const COVER_SIZES = '(max-width: 767px) 100vw, 560px';

export interface ArticleListCardProps {
  article: ArticleTeaser;
  href: ButtonLinkHref;
}

/**
 * Карточка статьи в листинге. Заголовок — `h2`: единственный `h1` страницы
 * занят названием раздела (инвариант 4).
 *
 * Кликабельна вся карточка, но доступным именем ссылки остаётся заголовок,
 * а не весь её текст: перекрытие рисует `::after`.
 */
export function ArticleListCard({ article, href }: ArticleListCardProps) {
  const excerpt = article.excerpt.trim();
  const category = article.category.trim();
  const cover = article.cover === null ? '' : article.cover.trim();

  return (
    <Card as="li" padding="none" interactive className={styles.card}>
      {cover === '' ? null : (
        <div className={styles.media}>
          <Image
            className={styles.cover}
            src={cover}
            alt={t.coverAlt(article.title)}
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            sizes={COVER_SIZES}
          />
        </div>
      )}

      <div className={styles.body}>
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

        <h2 className={styles.title}>
          <Link href={href} className={styles.link}>
            {article.title}
          </Link>
        </h2>

        {excerpt === '' ? null : <p className={styles.excerpt}>{excerpt}</p>}

        {/* «Читать →» из макета: для скринридера это шум — имя ссылки
            уже дал заголовок, поэтому строка скрыта от него целиком */}
        <span className={styles.more} aria-hidden="true">
          {t.readMore}
          <ArrowIcon size={15} />
        </span>
      </div>
    </Card>
  );
}
