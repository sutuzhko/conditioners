'use client';

import type { ReactNode } from 'react';
import { useId, useState } from 'react';

import styles from './Tooltip.module.css';

export type TooltipPlacement = 'top' | 'bottom' | 'right' | 'left';

export interface TooltipProps {
  /** Текст подсказки. Только строка: подсказка не место для вёрстки. */
  readonly text: string;
  /** То, что подсказывается: значок рельса, усечённое значение ячейки. */
  readonly children: ReactNode;
  readonly placement?: TooltipPlacement | undefined;
  readonly className?: string | undefined;
}

/**
 * Подсказка: значки рельса, усечённые значения таблиц (issue #332).
 *
 * 🔴 Подсказка — не единственный носитель смысла. Она дополняет то, что уже
 * названо: у значка рельса есть `aria-label`, у усечённой ячейки — полное
 * значение в `title`. На сенсорном экране наведения не бывает вовсе, и
 * содержимое, доступное только по наведению, для половины способов ввода не
 * существует.
 *
 * 🔴 Открывается наведением И фокусом. WCAG 1.4.13 требует, чтобы подсказка,
 * появившаяся по указателю, появлялась и с клавиатуры, и убиралась по Esc.
 */
export function Tooltip({ text, children, placement = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span
      className={[styles.wrap, className].filter(Boolean).join(' ')}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      /* Esc убирает подсказку, не уводя фокус: требование WCAG 1.4.13.
         Слушатель висит на обёртке, потому что цель фокуса — внутри неё. */
      onKeyDown={(event) => {
        if (event.key === 'Escape' && open) setOpen(false);
      }}
    >
      <span className={styles.anchor} aria-describedby={open ? tooltipId : undefined}>
        {children}
      </span>
      {/* Подсказка рисуется только открытой: пустой `role="tooltip"` в дереве
          озвучивается как безымянный элемент у каждого значка рельса. */}
      {open ? (
        <span
          className={[styles.bubble, styles[placement]].join(' ')}
          role="tooltip"
          id={tooltipId}
        >
          {text}
        </span>
      ) : null}
    </span>
  );
}
