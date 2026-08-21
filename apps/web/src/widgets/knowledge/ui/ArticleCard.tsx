import Image from 'next/image';
import Link from 'next/link';

import { Badge, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { formatDate, formatDateIso } from '@/shared/lib/format';

import { knowledgeContent as t } from '../content';
import type { ArticleTeaser } from '../model';
import styles from './ArticleCard.module.css';

/**
 * Обложка хранится с длинной стороной 1200px, витрине столько не нужно:
 * 480×270 (16:9) покрывает карточку с запасом на ретину, а `sizes` даёт
 * браузеру выбрать вариант поменьше.
 */
const COVER_WIDTH = 480;
const COVER_HEIGHT = 270;
const COVER_SIZES = '(max-width: 599px) 100vw, (max-width: 1199px) 50vw, 370px';

export interface ArticleCardProps {
  article: ArticleTeaser;
  href: ButtonLinkHref;
}

/**
 * Карточка статьи в тизере. Серверная: интерактивности здесь нет, вся
 * карточка — одна ссылка (перекрытие рисует `::after` у заголовка, чтобы
 * скринридер получил осмысленное имя ссылки, а не весь текст карточки).
 */
export function ArticleCard({ article, href }: ArticleCardProps) {
  const excerpt = article.excerpt.trim();
  const category = article.category.trim();

  return (
    <Card as="li" padding="none" elevation="none" interactive className={styles.card}>
      {article.cover === null || article.cover.trim() === '' ? null : (
        <div className={styles.media}>
          <Image
            className={styles.cover}
            src={article.cover}
            alt={t.coverAlt(article.title)}
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            sizes={COVER_SIZES}
          />
        </div>
      )}

      <div className={styles.body}>
        {category === '' ? null : (
          <Badge variant="accent" size="sm" mono className={styles.category}>
            {category}
          </Badge>
        )}

        <h3 className={styles.title}>
          <Link href={href} className={styles.link}>
            {article.title}
          </Link>
        </h3>

        {excerpt === '' ? null : <p className={styles.excerpt}>{excerpt}</p>}

        <p className={styles.meta}>
          <span className="srOnly">{t.dateLabel} </span>
          <time dateTime={formatDateIso(article.date)}>{formatDate(article.date)}</time>
          <span aria-hidden="true"> · </span>
          <span>{t.minutesLabel(article.minutes)}</span>
        </p>
      </div>
    </Card>
  );
}
