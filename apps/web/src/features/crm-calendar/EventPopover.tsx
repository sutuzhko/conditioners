'use client';

import Link from 'next/link';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { loadTitle } from '@/entities/crm/content';
import { Icon } from '@/shared/ui';

import { crmContent as texts, dayTitle } from './content';
import type { ScheduleItem } from './schedule';
import styles from './EventPopover.module.css';

export interface EventPopoverProps {
  readonly item: ScheduleItem;
  /** Прямоугольник записи на экране: карточка встаёт рядом с ней, а не в центре. */
  readonly anchor?: DOMRect | null | undefined;
  readonly onClose: () => void;
  readonly onEdit: () => void;
  readonly onRemove: () => void;
  /** Идёт запрос по этой записи: кнопки заперты, пока он не ответит. */
  readonly pending?: boolean | undefined;
}

/** Отступ карточки от записи и от края экрана. */
const GAP = 8;
const CARD_WIDTH = 288;

/**
 * Где встанет карточка.
 *
 * Справа от записи, если там есть место; иначе слева; если экран узок — под
 * записью во всю ширину. По вертикали карточка прижимается к экрану, а не
 * уезжает за него: запись в девять вечера открывается так же, как в девять
 * утра.
 */
function placeOf(anchor: DOMRect, height: number): { readonly top: number; readonly left: number } {
  const view = { width: window.innerWidth, height: window.innerHeight };

  const right = anchor.right + GAP;
  const left =
    right + CARD_WIDTH <= view.width - GAP
      ? right
      : anchor.left - GAP - CARD_WIDTH >= GAP
        ? anchor.left - GAP - CARD_WIDTH
        : Math.max(GAP, Math.min(anchor.left, view.width - CARD_WIDTH - GAP));

  const top = Math.max(GAP, Math.min(anchor.top, view.height - height - GAP));

  return { top, left };
}

/**
 * Карточка записи — вместо правой колонки дня (ADR-128).
 *
 * 🔴 Панель выбранного дня дублировала вид «день» и занимала треть экрана.
 * Детали открываются у самой записи: название, время, место и две кнопки —
 * ровно то, что владелец ждёт от календаря, которым пользуется каждый день.
 *
 * Ведёт себя как диалог: Escape закрывает, фокус уходит внутрь и возвращается
 * на запись, клик мимо закрывает. Без этого карточка была бы ловушкой для
 * клавиатуры.
 */
export function EventPopover({
  item,
  anchor,
  onClose,
  onEdit,
  onRemove,
  pending = false,
}: EventPopoverProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState<{ readonly top: number; readonly left: number } | null>(null);

  /* Позиция считается после отрисовки: до неё неизвестна высота карточки, а
     без высоты запись в конце дня открывала бы карточку за краем экрана. */
  useLayoutEffect(() => {
    if (anchor === null || anchor === undefined) return;

    const height = cardRef.current?.offsetHeight ?? 0;
    setPlace(placeOf(anchor, height));
  }, [anchor]);

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
    };

    /* Клик мимо карточки закрывает её — как в эталоне. Слушаем нажатие, а не
       клик: иначе кнопка под курсором успевает сработать раньше закрытия. */
    const onDown = (event: MouseEvent): void => {
      const card = cardRef.current;
      if (card !== null && event.target instanceof Node && !card.contains(event.target)) onClose();
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  const style = place === null ? undefined : { top: `${place.top}px`, left: `${place.left}px` };

  return (
    <div
      className={[styles.card, place === null ? styles.hidden : null].filter(Boolean).join(' ')}
      ref={cardRef}
      role="dialog"
      /* Имя диалога — вид записи и клиент: «Запись календаря» само по себе не
         говорит, о какой именно записи спрашивают, а их на экране десятки. */
      aria-label={`${texts.cardLabel}: ${item.title}`}
      tabIndex={-1}
      style={style}
    >
      <div className={styles.head}>
        <span className={`${styles.kind} ${styles[item.tone]}`}>
          <Icon name={item.icon} size={13} />
          {item.number === null ? item.kindTitle : texts.orderMark(item.number)}
        </span>

        <button className={styles.close} type="button" onClick={onClose} aria-label={texts.close}>
          <Icon name="close" size={14} />
        </button>
      </div>

      <p className={styles.title}>{item.title}</p>

      <p className={styles.when}>
        <Icon name="clock" size={13} aria-hidden="true" />
        {`${dayTitle(item.day)}, ${item.range}`}
      </p>

      {item.note === null ? null : (
        <p className={styles.where}>
          <Icon name="map-point" size={13} aria-hidden="true" />
          {item.note}
        </p>
      )}

      {item.phone === null ? null : (
        <a className={styles.phone} href={`tel:${item.phone}`}>
          <Icon name="phone" size={13} aria-hidden="true" />
          {item.phone}
        </a>
      )}

      {item.detail === null ? null : <p className={styles.detail}>{item.detail}</p>}

      {item.statusTitle === null ? null : <p className={styles.status}>{item.statusTitle}</p>}

      {/* 🔴 Число готовое, с сервера: пересчитывать переработку при показе
          нельзя — сдвиг рабочего окна переписал бы прошлый четверг (ADR-138). */}
      {item.overtimeMin <= 0 ? null : (
        <p className={styles.overtime}>
          <Icon name="danger" size={13} aria-hidden="true" />
          {texts.overtimeOf(loadTitle(item.overtimeMin))}
        </p>
      )}

      {item.person === null ? null : <p className={styles.person}>{item.person.title}</p>}

      <div className={styles.actions}>
        {item.href === null ? null : (
          <Link
            className={styles.action}
            href={{ pathname: item.href }}
            prefetch={false}
            onClick={onClose}
          >
            {item.hrefTitle}
          </Link>
        )}

        {item.edit === null ? null : (
          <>
            <button className={styles.action} type="button" onClick={onEdit} disabled={pending}>
              {item.edit.kind === 'event' ? texts.edit : texts.busyEdit}
            </button>
            <button
              className={`${styles.action} ${styles.danger}`}
              type="button"
              onClick={onRemove}
              disabled={pending}
            >
              {item.edit.kind === 'event' ? texts.remove : texts.busyDrop}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
