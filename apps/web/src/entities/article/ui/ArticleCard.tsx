import Image from 'next/image';
import Link from 'next/link';

import { Badge, Card } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { formatDate, formatDateIso } from '@/shared/lib/format';

import type { ArticleTeaser } from '../model';
import { articleLabels as t } from './content';
import styles from './ArticleCard.module.css';

/**
 * Обложка хранится с длинной стороной 1200px, витрине столько не нужно.
 * 480×270 (16:9) покрывает и полосу 96px, и карточку десктопа с запасом на
 * ретину, а `sizes` даёт браузеру выбрать вариант поменьше.
 *
 * 🔴 До 600px обложки в карточке нет вовсе (issue #279), и `sizes` начинается
 * с полосы: ниже порога изображение скрыто `display: none`, а раз оно не
 * `priority`, браузер грузит его лениво — то есть в скрытом поддереве не
 * грузит совсем. Так «нет обложки на телефоне» стоит нуля байтов, а не одного
 * лишнего запроса.
 */
const COVER_WIDTH = 480;
const COVER_HEIGHT = 270;
const COVER_SIZES = '(max-width: 1199px) 112px, 380px';

export interface ArticleCardProps {
  article: ArticleTeaser;
  /** Адрес статьи: карта URL принадлежит странице (docs/SEO.md §1). */
  href: ButtonLinkHref;
  /**
   * Уровень заголовка карточки. В тизере главной над ней стоит `h2` секции,
   * значит карточка — `h3`; в листинге единственный `h1` занят названием
   * раздела, и карточка идёт `h2` (инвариант 4).
   */
  headingLevel?: 2 | 3 | undefined;
}

/**
 * Карточка статьи — одна на тизер главной и на листинг `/knowledge`.
 *
 * Живёт в сущности, а не в виджете: карточка это представление статьи, и
 * пока копий было две, они расходились геометрией при каждой правке, а
 * импортировать соседний виджет запрещает правило слоёв.
 *
 * Серверная: интерактивности здесь нет. Вся карточка — одна ссылка, но
 * доступным именем ссылки остаётся заголовок, а не весь её текст —
 * перекрытие рисует `::after`.
 */
export function ArticleCard({ article, href, headingLevel = 3 }: ArticleCardProps) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const excerpt = article.excerpt.trim();
  const category = article.category.trim();
  const cover = article.cover === null ? '' : article.cover.trim();

  return (
    <Card as="li" padding="none" elevation="none" interactive className={styles.card}>
      {/* 🔴 Место обложки занято всегда только на десктопе, где она стоит
          сверху и задаёт высоту карточки (ADR-127). Ниже 1200 плашка не
          рисуется: в полосе 96px её подпись нечитаема, а рубрику и так
          называет ярлык в теле карточки. */}
      <div className={styles.media} data-empty={cover === ''}>
        {cover === '' ? (
          <span className={styles.placeholder} aria-hidden="true">
            {category === '' ? t.coverFallbackLabel : category}
          </span>
        ) : (
          <Image
            className={styles.cover}
            src={cover}
            alt={t.coverAlt(article.title)}
            width={COVER_WIDTH}
            height={COVER_HEIGHT}
            sizes={COVER_SIZES}
          />
        )}
      </div>

      <div className={styles.body}>
        {category === '' ? null : (
          <Badge variant="accent" size="sm" mono className={styles.category}>
            <span className="srOnly">{t.categoryLabel} </span>
            {category}
          </Badge>
        )}

        <Heading className={styles.title}>
          <Link href={href} className={styles.link}>
            {article.title}
          </Link>
        </Heading>

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
