'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import { timeOfMinutes } from '@/entities/crm/lib/busy';
import type { DayKey } from '@/shared/lib/calendar';

import { useCalendarActions } from './actions';
import { capturePointer, releasePointer } from './pointer';
import { crmContent as texts, dayTitle } from './content';
import { DURATION_STEP_MIN, MIN_EVENT_MIN } from './model';
import { HOURS_IN_DAY } from './schedule';
import styles from './ColumnCanvas.module.css';

const MINUTES_IN_DAY = HOURS_IN_DAY * 60;
const DRAG_THRESHOLD_PX = 4;

export interface ColumnCanvasProps {
  readonly day: DayKey;
  /** Часы за рабочим окном: их фон помечает переработку (ADR-138). */
  readonly offHours: readonly number[];
  /**
   * Ходит ли по часам клавиатура.
   *
   * 🔴 В дне — да: двадцать четыре остановки, и человек доходит до нужного
   * часа. В неделе колонок семь, и те же остановки превратились бы в сто
   * шестьдесят восемь нажатий Tab до первой записи — доступность, которая
   * мешает. Там час остаётся ускорителем для мыши и пальца, а с клавиатуры
   * запись заводится кнопкой «Новое дело» в шапке: дата и время у формы свои.
   */
  readonly reachable?: boolean | undefined;
}

function snap(minutes: number): number {
  return Math.round(minutes / DURATION_STEP_MIN) * DURATION_STEP_MIN;
}

/**
 * Пустое место колонки: отсюда заводится запись.
 *
 * 🔴 Клик по часу и протяжка — ускорители для мыши (CRM §3.5.1). Клавиатура и
 * тач получают тот же час обычной кнопкой: каждый час — отдельная кнопка с
 * подписью «Новое дело: 27 августа, 10:00». Без этого календарь недоступен
 * половине способов работы, а протяжка на тач-экране отбирает прокрутку.
 *
 * Лежит под записями: занятый час открывает запись, свободный — форму.
 */
export function ColumnCanvas({ day, offHours, reachable = true }: ColumnCanvasProps) {
  const actions = useCalendarActions();
  const canvasRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<{ readonly y: number; readonly minutes: number } | null>(null);
  const movedRef = useRef(false);
  const [ghost, setGhost] = useState<{ readonly from: number; readonly to: number } | null>(null);

  const off = new Set(offHours);

  /** Минуты под курсором. Полоса покрывает ровно сутки, отсюда и перевод. */
  const minutesAt = (clientY: number): number | null => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect === undefined || rect.height <= 0) return null;

    const share = (clientY - rect.top) / rect.height;
    return Math.min(Math.max(snap(share * MINUTES_IN_DAY), 0), MINUTES_IN_DAY);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    /* Только основная кнопка мыши и только указатель, которым можно тянуть:
       на тач-экране протяжка отобрала бы у страницы вертикальную прокрутку. */
    if (event.button !== 0 || event.pointerType === 'touch') return;

    const minutes = minutesAt(event.clientY);
    if (minutes === null) return;

    capturePointer(event.currentTarget, event.pointerId);
    movedRef.current = false;
    startRef.current = { y: event.clientY, minutes };
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const start = startRef.current;
    if (start === null) return;

    if (!movedRef.current && Math.abs(event.clientY - start.y) < DRAG_THRESHOLD_PX) return;

    const minutes = minutesAt(event.clientY);
    if (minutes === null) return;

    movedRef.current = true;
    const from = Math.min(start.minutes, minutes);
    const to = Math.max(Math.max(start.minutes, minutes), from + MIN_EVENT_MIN);
    setGhost({ from, to });
  };

  const onPointerUp = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const start = startRef.current;
    startRef.current = null;

    releasePointer(event.currentTarget, event.pointerId);

    const drawn = ghost;
    setGhost(null);
    if (start === null || !movedRef.current || drawn === null) return;

    actions.create(day, drawn.from, drawn.to);
  };

  return (
    <div
      className={styles.canvas}
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {Array.from({ length: HOURS_IN_DAY }, (_, hour) => (
        <button
          className={[styles.hour, off.has(hour) ? styles.offHour : null].filter(Boolean).join(' ')}
          key={hour}
          type="button"
          /* Протяжка кончается кликом браузера по кнопке под курсором: без
             этой проверки после протяжки открылись бы две формы подряд. */
          onClick={() => {
            if (movedRef.current) {
              movedRef.current = false;
              return;
            }
            actions.create(day, hour * 60);
          }}
          aria-label={texts.createAt(dayTitle(day), timeOfMinutes(hour * 60))}
          tabIndex={reachable ? undefined : -1}
          /* 🔴 Линия часа — масштаб, а не край цели (ADR-235). Час опознают по
             месту в столбце дня и на шкале времени, а не по рамке; сама цель
             показывает себя наведением, кольцом фокуса и курсором `cell`.
             Поднять линию до 3:1 значило бы разлиновать календарь чёрной
             сеткой — то есть испортить единственную часть интерфейса, которая
             владельца устраивает (ADR-128). Атрибут снимает с этой границы
             проверку 1.4.11 в `scripts/admin-contrast.mjs`; требование к
             тексту и к самой цели остаётся. */
          data-contrast-border="scale"
        />
      ))}

      {ghost === null ? null : (
        <span
          className={styles.ghost}
          aria-hidden="true"
          style={{
            top: `${(ghost.from / MINUTES_IN_DAY) * 100}%`,
            height: `${((ghost.to - ghost.from) / MINUTES_IN_DAY) * 100}%`,
          }}
        >
          {`${timeOfMinutes(ghost.from)}–${timeOfMinutes(ghost.to)}`}
        </span>
      )}
    </div>
  );
}
