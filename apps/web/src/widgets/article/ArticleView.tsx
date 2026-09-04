import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { parseArticleBody } from '@/entities/article/lib/parseArticleBody';
import { articleLabels as labels } from '@/entities/article/ui';
import { Icon, Badge, ButtonLink } from '@/shared/ui';
import type { ButtonLinkHref } from '@/shared/ui';
import { formatDate, formatDateIso } from '@/shared/lib/format';

import { ArticleBody } from './ArticleBody';
import { ArticleToc } from './ArticleToc';
import { articleContent as t } from './content';
import type { ArticleFull, ArticleLink } from './model';
import { articleOutline } from './outline';
import styles from './ArticleView.module.css';

/**
 * Обложка хранится с длинной стороной 1200px: `server/uploads/store.ts`
 * ужимает загруженное `fit: 'inside'`, то есть **сохраняет соотношение
 * сторон исходника** и только ограничивает габарит.
 *
 * 🔴 Высота 630, а не 525. Прежнее число задавало пропорцию 16:7 «из
 * макета», но ни загрузчик, ни база её не обеспечивают: соотношение у
 * обложки любое, какое было у файла владельца. Рамка 16:7 при
 * `object-fit: cover` срезала у настоящей обложки 1200×630 **16,7% высоты**
 * — поровну сверху и снизу, ровно по строке подписи внизу картинки.
 *
 * 630 — не менее произвольное число, а то, что приходит на самом деле:
 * стандарт картинки Open Graph 1200×630, в нём же демо-сид кладёт обложки.
 * Обложка другого соотношения по-прежнему обрежется — но теперь это
 * осознанная рамка, а не расхождение объявленного с настоящим.
 *
 * 🔴 Убрать рамку совсем нельзя: размеры файла в базе не хранятся
 * (`Article.cover` — только адрес), и без объявленной пропорции браузеру
 * нечего резервировать под картинку — вернётся сдвиг вёрстки, а CLS здесь
 * половина оценки Core Web Vitals. Настоящее решение — хранить размеры при
 * загрузке, и это отдельная задача: она меняет схему и контракт.
 */
const COVER_WIDTH = 1200;
const COVER_HEIGHT = 630;
const COVER_SIZES = '(max-width: 767px) 100vw, 620px';

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
              <span className="srOnly">{labels.categoryLabel} </span>
              {category}
            </Badge>
          )}
          <span className={styles.dates}>
            <span className="srOnly">{labels.dateLabel} </span>
            <time dateTime={formatDateIso(article.date)}>{formatDate(article.date)}</time>
            <span aria-hidden="true"> · </span>
            <span>{labels.minutesLabel(article.minutes)}</span>
          </span>
        </p>

        <h1 className={styles.title}>{article.title}</h1>
      </header>

      {/* обложку владелец загружает не всегда — статья обязана жить и без неё */}
      {cover === '' ? null : (
        <Image
          className={styles.cover}
          src={cover}
          alt={labels.coverAlt(article.title)}
          width={COVER_WIDTH}
          height={COVER_HEIGHT}
          sizes={COVER_SIZES}
          priority
        />
      )}

      {/* 🔴 Оглавление и текст лежат в одной сетке: с 900 оглавление
          становится липкой боковой колонкой слева, ниже — остаётся обычным
          блоком над текстом, где оно и стояло. Порядок в разметке один на
          все ширины, переезжает только место (issue #280). */}
      <div className={styles.layout}>
        {headings.length < MIN_TOC_HEADINGS ? null : (
          <div className={styles.toc}>
            <ArticleToc headings={headings} />
          </div>
        )}

        <ArticleBody blocks={blocks} className={styles.text} />
      </div>

      {/* 🔴 Тёмный остров внутри светлой страницы объявляет себя грунтом
          (ADR-158, issue #534). Без атрибута приглушённые уровни остаются
          подобранными под белый фон и на `--panel` не читаются: подпись
          давала 3,23:1, ссылки — 3,33:1 при норме 4,5. Та же панель у
          страницы модели (`ProductCta`) грунт получает от `Card variant`,
          здесь карточки нет — и атрибут ставится руками. */}
      <aside className={styles.cta} data-ground="panel">
        <div className={styles.ctaText}>
          <p className={styles.ctaTitle}>{t.ctaTitle}</p>
          <p className={styles.ctaLead}>{t.ctaText}</p>
        </div>
        <div className={styles.ctaActions}>
          <ButtonLink href={leadHref} variant="flat" size="lg">
            {t.ctaLead}
          </ButtonLink>
          {links.length === 0 ? null : (
            <ul className={styles.ctaLinks}>
              {links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className={styles.ctaLink}>
                    {link.label}
                    <Icon name="arrow-right" size={15} />
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
