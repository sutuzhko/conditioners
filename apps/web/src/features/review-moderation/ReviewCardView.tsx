'use client';

import { REVIEW_STATUS_VARIANT } from '@/entities/review/model';
import { Avatar, Badge, Button, Card, Rating } from '@/shared/ui';
import type { ButtonVariant, Confirm } from '@/shared/ui';

import { reviewModerationContent as texts } from './content';
import { reviewActionsFor } from './model';
import type { ReviewAction, ReviewApi, ReviewCard, ReviewTab } from './model';
import { ReviewPhoto } from './ReviewPhoto';
import { useReviewActions } from './useReviewActions';
import styles from './ReviewCardView.module.css';

export interface ReviewCardViewProps {
  readonly review: ReviewCard;
  readonly api: ReviewApi;
  /** Открытая вкладка: от неё зависит, что можно сделать с отзывом. */
  readonly tab?: ReviewTab | undefined;
  readonly onChanged?: (() => void) | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/** Подпись и заметность действия. Порядок в ряду задаёт `reviewActionsFor`. */
export const REVIEW_ACTION_LOOK: Record<ReviewAction, { label: string; variant: ButtonVariant }> = {
  approve: { label: texts.approve, variant: 'solid' },
  reject: { label: texts.reject, variant: 'bordered' },
  restore: { label: texts.restore, variant: 'bordered' },
  archive: { label: texts.archive, variant: 'bordered' },
  remove: { label: texts.remove, variant: 'light' },
};

/**
 * Отзыв в модерации.
 *
 * 🔴 Текст выводится и не правится (инвариант 7): ни на одной вкладке нет
 * поля ввода поверх него. Модератор меняет только статус.
 *
 * 🔴 Текст показан целиком, без «показать ещё» (issue #356): решение
 * принимают по отзыву, а не по первой его строке.
 */
export function ReviewCardView({
  review,
  api,
  tab,
  onChanged,
  confirmRemove,
}: ReviewCardViewProps) {
  /* Подтверждение, причина отказа и разбор ответа — общие с таблицами вкладок
     (issue #613): вторая реализация тех же правил отстала бы молча. */
  const { busy, message, perform, dialogs } = useReviewActions({
    review,
    api,
    onChanged,
    confirmRemove,
  });

  const actions = reviewActionsFor(tab ?? 'all', review.status);

  return (
    <Card as="article" className={styles.card}>
      <div className={styles.main}>
        <div className={styles.lead}>
          {/* 🔴 Первой строкой — оценка, статус и время прихода (issue #752,
              артборд «Отзывы»). До этого строку открывали аватар 48px и имя
              кеглем заголовка: карточку читали сверху вниз как «кто», хотя
              модератор решает по «что и когда». */}
          <div className={styles.line}>
            {/* 🔴 Подписи рядом со звёздами нет (issue #752, макет): она
                повторяла словами то же, что показывают звёзды, и вдобавок
                удваивалась в имени для читалки — `Rating` вставляет подпись в
                `aria-label` следом за той же формулировкой («Оценка 5 из 5.
                Оценка 5 из 5»). Без неё имя остаётся полным. */}
            <Rating value={review.rating} size="sm" />
            <Badge variant={REVIEW_STATUS_VARIANT[review.status]} size="sm">
              {texts.statusTitle(review.status)}
            </Badge>
            <time className={styles.when} dateTime={review.createdAt}>
              {texts.when(review.createdAt)}
            </time>
          </div>

          {/* Чужие слова: цитата, а не поле ввода — правки к ней не
              предполагается, и «показать ещё» здесь тоже нет. */}
          <blockquote className={styles.text}>{review.text}</blockquote>

          {/* Автор стоит подписью под цитатой, как в макете: имя — заголовок
              карточки для читалки, но не главное на экране. Ни телефона, ни
              номера заказа рядом нет — их у отзыва не существует в схеме
              (PIXEL_SPEC, П-5). */}
          <div className={styles.author}>
            <Avatar
              name={review.name}
              size="sm"
              {...(review.avatar === null ? {} : { src: review.avatar })}
            />
            <h2 className={styles.name}>{review.name}</h2>
          </div>
        </div>

        {/* 🔴 От 1200px снимок и решения стоят колонкой справа от цитаты
            (макет), ниже — под ней: справа от абзаца кнопкам не хватает
            ширины, и «Опубликовать» сжимается до «Опубли…». Разметка одна,
            место меняет сетка. */}
        <div className={styles.side}>
          {review.photo === null ? null : (
            <div className={styles.photo}>
              <ReviewPhoto
                src={review.photo}
                name={review.name}
                missing={review.photoMissing === true}
              />
            </div>
          )}

          <div className={styles.actions}>
            {actions.map((action) => (
              <Button
                key={action}
                type="button"
                size="sm"
                variant={REVIEW_ACTION_LOOK[action].variant}
                className={action === 'remove' ? styles.remove : undefined}
                disabled={busy}
                onClick={() => perform(action)}
              >
                {REVIEW_ACTION_LOOK[action].label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* 🔴 Причина показывается там же, где отзыв, а не в отдельном журнале:
          решение и его основание читаются вместе или не читаются вовсе.
          У отклонённых до появления поля причины нет — так и написано, пустая
          строка читалась бы как «причины не было». */}
      {review.status === 'rejected' ? (
        <p className={styles.reason}>
          <span className={styles.reasonLabel}>{texts.reasonTitle}</span>
          {review.reject === null ? (
            <span className={styles.reasonMissing}>{texts.reasonMissing}</span>
          ) : (
            <>
              <span className={styles.reasonText}>{review.reject.reason}</span>
              <span className={styles.reasonBy}>
                {texts.reasonBy(review.reject.by, review.reject.at)}
              </span>
            </>
          )}
        </p>
      ) : null}

      {tab === 'pending' && review.rating <= 3 ? (
        <p className={styles.note}>{texts.lowRatingNote}</p>
      ) : null}

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialogs}
    </Card>
  );
}
