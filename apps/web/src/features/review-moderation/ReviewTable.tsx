'use client';

import { useRouter } from 'next/navigation';

import { REVIEW_STATUS_VARIANT } from '@/entities/review/model';
import { Avatar, Badge, ButtonLink, Card, EmptyState, Rating, Table } from '@/shared/ui';

import { reviewModerationContent as texts } from './content';
import { reviewApi } from './lib';
import { reviewsHref, type ReviewCard, type ReviewTab } from './model';
import { ReviewRowActions } from './ReviewRowActions';
import styles from './ReviewTable.module.css';

/** Колонки, из которых собираются таблицы вкладок. */
type ReviewColumn = 'author' | 'rating' | 'text' | 'status' | 'received' | 'reject' | 'actions';

/**
 * 🔴 У каждой вкладки свой набор колонок (issue #613, макет `ContentTabs`).
 *
 * Одна таблица на все вкладки показывала бы пустую колонку «Причина отказа» у
 * опубликованных и пустой «Статус» там, где он у всех строк одинаковый, — а
 * пустая колонка читается как «данных нет», хотя их и не должно быть.
 *
 * «На модерации» здесь нет: там решают по тексту целиком, и это карточки.
 */
const COLUMNS: Record<Exclude<ReviewTab, 'pending'>, readonly ReviewColumn[]> = {
  published: ['author', 'rating', 'text', 'received', 'actions'],
  rejected: ['author', 'text', 'reject', 'actions'],
  archived: ['author', 'rating', 'text', 'received', 'actions'],
  all: ['author', 'rating', 'text', 'status', 'received', 'actions'],
};

const COLUMN_TITLES: Record<ReviewColumn, string> = {
  author: texts.colAuthor,
  rating: texts.colRating,
  text: texts.colText,
  status: texts.colStatus,
  received: texts.colReceived,
  reject: texts.colReason,
  actions: texts.colActions,
};

/** Ширины колонок из макета: имя и дата не должны растягиваться за текстом. */
const HEAD_CLASS: Record<ReviewColumn, string | undefined> = {
  author: styles.colAuthor,
  rating: styles.colRating,
  text: undefined,
  status: styles.colStatus,
  received: styles.colDate,
  reject: styles.colReject,
  actions: styles.colActions,
};

/**
 * 🔴 Ширины колонок живут только в шапке. Ниже 600px кит раскладывает строки
 * карточками (`display: block`), и `width` на ячейке распёрла бы карточку
 * шире экрана — то самое «документ вбок», которое ловят инварианты. Ячейке
 * достаётся лишь то, что от ширины не зависит.
 */
const CELL_CLASS: Record<ReviewColumn, string | undefined> = {
  author: undefined,
  /* Колонка оценки закрыта ниже 1200px — класс нужен и на ячейке. */
  rating: styles.colRating,
  text: undefined,
  status: undefined,
  received: styles.cellDate,
  reject: undefined,
  actions: undefined,
};

export interface ReviewTableProps {
  readonly reviews: readonly ReviewCard[];
  /** Открытая вкладка: она задаёт и колонки, и набор действий строки. */
  readonly tab: Exclude<ReviewTab, 'pending'>;
  /** Пусто, потому что вкладка отобрала по статусу, а не потому что отзывов нет. */
  readonly filtered?: boolean | undefined;
  /** Пусто из-за поиска и условий вкладки «Все» — сбрасывать надо их. */
  readonly searched?: boolean | undefined;
}

/**
 * Отзывы таблицей: «Опубликованные», «Отклонённые», «В архиве» и «Все»
 * (issue #613).
 *
 * 🔴 Текст выводится и не правится (инвариант 7): поля ввода поверх него нет
 * ни в одной ячейке. На широком экране он ограничен тремя строками с
 * многоточием — таблицу читают, сравнивая строки, — а на телефоне, где кит
 * раскладывает строки карточками, показывается целиком.
 *
 * 🔴 Колонка действий есть и на вкладке «Все», хотя макет её там не рисует:
 * найденный отзыв иначе пришлось бы искать второй раз на своей вкладке,
 * только чтобы нажать одну кнопку (ADR-307 §4).
 */
export function ReviewTable({
  reviews,
  tab,
  filtered = false,
  searched = false,
}: ReviewTableProps) {
  const router = useRouter();
  const columns = COLUMNS[tab];

  if (reviews.length === 0) {
    return (
      <Card as="section">
        {searched ? (
          <EmptyState
            icon="search"
            title={texts.emptySearch}
            action={
              <ButtonLink href={reviewsHref('all')} size="sm" variant="bordered">
                {texts.emptySearchAction}
              </ButtonLink>
            }
          >
            {texts.emptySearchText}
          </EmptyState>
        ) : filtered ? (
          <EmptyState
            icon="search"
            title={texts.emptyFiltered}
            action={
              /* Сброс ведёт на «Все», а не в раздел: раздел без параметра —
                 это «На модерации», то есть снова фильтр (issue #340). */
              <ButtonLink href={reviewsHref('all')} size="sm" variant="bordered">
                {texts.emptyFilteredAction}
              </ButtonLink>
            }
          >
            {texts.emptyFilteredText}
          </EmptyState>
        ) : (
          <EmptyState
            icon="chat"
            title={texts.emptyTitle}
            action={
              <ButtonLink href="/#reviews" size="sm" variant="bordered">
                {texts.emptyAction}
              </ButtonLink>
            }
          >
            {texts.emptyText}
          </EmptyState>
        )}
      </Card>
    );
  }

  return (
    <Card as="section" padding="none">
      {/* Ширины не задаём: между 600 и 900 таблица прокручивается вбок сама,
          ниже 600 кит раскладывает строки карточками. */}
      <Table label={texts.tableLabel(tab)} variant="cards">
        <thead>
          <tr role="row">
            {columns.map((column) => (
              <th key={column} className={HEAD_CLASS[column]} scope="col">
                {column === 'actions' ? (
                  /* Имя колонки читалке нужно, а на экране оно только повторяет
                     подписи кнопок под собой. */
                  <span className="srOnly">{COLUMN_TITLES[column]}</span>
                ) : (
                  COLUMN_TITLES[column]
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {reviews.map((review) => (
            <tr key={review.id} role="row">
              {columns.map((column) => (
                <td
                  key={column}
                  className={CELL_CLASS[column]}
                  role="cell"
                  {...(column === 'actions' ? {} : { 'data-label': COLUMN_TITLES[column] })}
                >
                  <ReviewCell
                    column={column}
                    review={review}
                    tab={tab}
                    onChanged={() => router.refresh()}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}

/** Содержимое одной ячейки. Вынесено, чтобы таблица оставалась описанием колонок. */
function ReviewCell({
  column,
  review,
  tab,
  onChanged,
}: {
  readonly column: ReviewColumn;
  readonly review: ReviewCard;
  readonly tab: Exclude<ReviewTab, 'pending'>;
  readonly onChanged: () => void;
}) {
  if (column === 'author') {
    return (
      <span className={styles.author}>
        <Avatar
          name={review.name}
          size="sm"
          {...(review.avatar === null ? {} : { src: review.avatar })}
        />
        <span className={styles.who}>
          <span className={styles.name}>{review.name}</span>
          {/* 🔴 До 1200px своей колонки у оценки нет — она переезжает под имя
              (макет `ContentTabs`, 768). Показанная и в колонке, и здесь, она
              читалась бы как две разные оценки. */}
          <span className={styles.narrowOnly}>
            <Rating value={review.rating} size="sm" />
          </span>
        </span>
      </span>
    );
  }

  if (column === 'rating') return <Rating value={review.rating} size="sm" />;

  if (column === 'text') {
    /* Чужие слова: цитата, а не поле ввода — правки к ней не предполагается
       (инвариант 7). */
    return <blockquote className={styles.text}>{review.text}</blockquote>;
  }

  if (column === 'status') {
    return (
      <Badge variant={REVIEW_STATUS_VARIANT[review.status]} size="sm">
        {texts.statusTitle(review.status)}
      </Badge>
    );
  }

  if (column === 'received') {
    return (
      <time className={styles.when} dateTime={review.createdAt}>
        {texts.when(review.createdAt)}
      </time>
    );
  }

  if (column === 'reject') {
    /* 🔴 Причина и её автор читаются вместе или не читаются вовсе: без «кто и
       когда» через полгода решение снова ничьё (ADR-300). Отклонённым до
       появления поля причина не выдумывается — так и написано. */
    return review.reject === null ? (
      <span className={styles.reasonMissing}>{texts.reasonMissing}</span>
    ) : (
      <span className={styles.reason}>
        <span className={styles.reasonText}>{review.reject.reason}</span>
        <span className={styles.reasonBy}>
          {texts.reasonBy(review.reject.by, review.reject.at)}
        </span>
      </span>
    );
  }

  return <ReviewRowActions review={review} api={reviewApi} tab={tab} onChanged={onChanged} />;
}
