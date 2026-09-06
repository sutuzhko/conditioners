'use client';

import type { ReactNode } from 'react';
import { useCallback, useId, useRef, useState } from 'react';

import { Portal } from '../lib/Portal';
import { useAnchoredLayer, type LayerPlacement } from '../lib/useAnchoredLayer';
import styles from './Tooltip.module.css';

export type TooltipPlacement = 'top' | 'bottom' | 'right' | 'left';

export interface TooltipProps {
  /** Текст подсказки. Только строка: подсказка не место для вёрстки. */
  readonly text: string;
  /** То, что подсказывается: значок рельса, действие строки, усечённая ячейка. */
  readonly children: ReactNode;
  readonly placement?: TooltipPlacement | undefined;
  readonly className?: string | undefined;
}

/** Зазор между целью и пузырьком — тот же, что был у абсолютного варианта. */
const GAP = 8;

/**
 * Подсказка: значки рельса, действия строки, усечённые значения таблиц
 * (issue #332).
 *
 * 🔴 Подсказка — не единственный носитель смысла. Она дополняет то, что уже
 * названо: у значка рельса и у действия строки есть `aria-label`, у усечённой
 * ячейки — полное значение. На сенсорном экране наведения не бывает вовсе, и
 * содержимое, доступное только по наведению, для половины способов ввода не
 * существует.
 *
 * 🔴 Открывается наведением И фокусом. WCAG 1.4.13 требует, чтобы подсказка,
 * появившаяся по указателю, появлялась и с клавиатуры, и убиралась по Esc.
 *
 * 🔴 Пузырёк уходит порталом и лежит `position: fixed`, считая координаты от
 * цели. Пока он был в потоке, любой предок с прокруткой его обрезал — а это
 * все таблицы панели: контейнер с `overflow-x: auto` по спецификации получает
 * и `overflow-y: auto`. Портал снимает заодно наложение: залипающая ячейка
 * создаёт свой контекст, и подсказка уезжала под соседнюю колонку. Тот же
 * приём, что у меню строки (issue #573).
 */
export function Tooltip({ text, children, placement = 'top', className }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLSpanElement>(null);
  const bubbleRef = useRef<HTMLSpanElement>(null);
  const tooltipId = useId();

  /**
   * Куда встать: сторона выбирается по месту на экране, а не по просьбе
   * вызывающего — подсказка у нижней строки таблицы, поставленная сверху, ушла
   * бы за край окна, а подсказка, которой не видно, не подсказка.
   */
  const measure = useCallback((): LayerPlacement | null => {
    const anchor = anchorRef.current;
    const bubble = bubbleRef.current;
    if (anchor === null || bubble === null) return null;

    const rect = anchor.getBoundingClientRect();
    const { offsetWidth: width, offsetHeight: height } = bubble;

    const fitsAbove = rect.top > height + GAP;
    const fitsBelow = window.innerHeight - rect.bottom > height + GAP;
    const side =
      placement === 'top' && !fitsAbove
        ? 'bottom'
        : placement === 'bottom' && !fitsBelow
          ? 'top'
          : placement;

    const centreX = rect.left + rect.width / 2 - width / 2;
    const centreY = rect.top + rect.height / 2 - height / 2;

    /* Прижимаем к окну по обеим осям: у крайней правой колонки подсказка
       вылезала за край, и половина слова оказывалась за экраном. */
    const clamp = (value: number, max: number): number => Math.max(GAP, Math.min(value, max - GAP));

    return {
      top:
        side === 'top'
          ? rect.top - GAP - height
          : side === 'bottom'
            ? rect.bottom + GAP
            : clamp(centreY, window.innerHeight - height),
      left:
        side === 'left'
          ? rect.left - GAP - width
          : side === 'right'
            ? rect.right + GAP
            : clamp(centreX, window.innerWidth - width),
    };
  }, [placement]);

  /* 🔴 Пузырёк стоит у своего якоря в каждом кадре (ADR-328, issue #683).
     Событий на переезд якоря не бывает: он умеет уехать, не изменившись в
     размере, — и подсказка оставалась стоять по замеру, снятому до сдвига,
     указывая мимо своего ярлыка. Слежение общее с меню строки, где тот же
     дефект чинился первым (issue #660, #665). */
  useAnchoredLayer({ open, layerRef: bubbleRef, measure });

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
      <span
        ref={anchorRef}
        className={styles.anchor}
        aria-describedby={open ? tooltipId : undefined}
      >
        {children}
      </span>

      {/* Подсказка рисуется только открытой: пустой `role="tooltip"` в дереве
          озвучивается как безымянный элемент у каждого значка рельса. */}
      {open ? (
        <Portal>
          <span ref={bubbleRef} className={styles.bubble} role="tooltip" id={tooltipId}>
            {text}
          </span>
        </Portal>
      ) : null}
    </span>
  );
}
