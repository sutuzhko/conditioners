'use client';

import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { HOURS_IN_DAY } from './schedule';

const MINUTES_IN_DAY = HOURS_IN_DAY * 60;

export interface GridScrollProps {
  /** Начало рабочего окна в минутах от московской полуночи (ADR-138). */
  readonly workFromMin: number;
  /** Имя области прокрутки: без него она безымянна для скринридера. */
  readonly label: string;
  readonly className?: string | undefined;
  readonly children: ReactNode;
}

/**
 * Полоса прокрутки сетки часов.
 *
 * 🔴 Сетка рисует сутки целиком, а открывается на рабочей части (CRM §3.5.1):
 * пятнадцать пустых ночных часов на экране у компании, работающей днём, — это
 * то, за что календарь и забраковали. Ночь никуда не девается, она доступна
 * прокруткой.
 *
 * Позиция ставится здесь, а не в CSS: начальной прокрутки в CSS нет, а
 * подрезать сутки до окна значило бы спрятать монтаж, назначенный на семь
 * утра. Содержимое приходит с сервера готовым — это лист, а не календарь.
 *
 * `tabIndex` обязателен: прокручиваемая область без него недостижима с
 * клавиатуры, и ночные часы остались бы только для мыши.
 */
export function GridScroll({ workFromMin, label, className, children }: GridScrollProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const box = boxRef.current;
    if (box === null) return;

    /* Небольшой запас сверху: час до начала работы виден, и «начало дня» не
       упирается в самый край — так понятнее, что выше есть ещё время. */
    const from = Math.max(workFromMin - 60, 0);
    box.scrollTop = (from / MINUTES_IN_DAY) * box.scrollHeight;
  }, [workFromMin]);

  return (
    <div className={className} ref={boxRef} tabIndex={0} role="group" aria-label={label}>
      {children}
    </div>
  );
}
