'use client';

import { useState, type DragEvent, type KeyboardEvent } from 'react';

import { formatQty, stockManagerContent as texts } from './content';
import { useStockMove } from './StockMoveScope';
import type { StockUnit } from './model';
import styles from './StockCell.module.css';

export interface StockCellProps {
  readonly itemId: string;
  readonly itemName: string;
  readonly unit: StockUnit;
  readonly zoneId: string;
  readonly zoneName: string;
  readonly qty: number;
  /** Зона в архиве: движений в неё уже не будет, класть туда нечего. */
  readonly closed?: boolean | undefined;
  /** Первая ячейка сетки: с неё начинается обход остатков с клавиатуры. */
  readonly first?: boolean | undefined;
}

/**
 * Ячейка остатка: она же ручка перемещения между зонами (ADR-137).
 *
 * 🔴 Перетаскивание — ускоритель для мыши, а не единственный путь (CRM §11.3).
 * Та же ячейка работает с клавиатуры: Enter берёт остаток, Enter на соседней
 * зоне кладёт его туда, Escape отменяет. Пальцем и с клавиатуры остаётся ещё
 * и кнопка «Переместить» в строке — склад смотрят с телефона в машине.
 *
 * 🔴 Табуляция обходит сетку одной остановкой, а не шестьюдесятью: внутри
 * ходят стрелками, как по таблице. Иначе клавиша Tab на разделе склада
 * перестала бы вести куда бы то ни было.
 *
 * Отпускание не проводит движение молча: оно открывает окно с подставленными
 * позицией и зонами. Промах пальцем не должен становиться записью в журнале.
 */
export function StockCell({
  itemId,
  itemName,
  unit,
  zoneId,
  zoneName,
  qty,
  closed = false,
  first = false,
}: StockCellProps) {
  const move = useStockMove();
  const [over, setOver] = useState(false);

  const key = `${itemId}:${zoneId}`;
  const held = move?.grabbed ?? null;
  const mine = held !== null && held.itemId === itemId;
  const source = mine && held.zoneId === zoneId;
  const target = mine && !source && !closed;
  /* Взять можно только то, что есть: минус означает, что склад разошёлся с
     реальностью, и переносить расхождение в другую зону незачем. */
  const takeable = move !== null && !closed && qty > 0;

  /* 🔴 В ячейке остаётся число, единица вынесена в свою колонку (issue #607).
     Голосом ячейка по-прежнему называется целиком: «12 м» — величина, и без
     единицы одно число вне таблицы не значит ничего. */
  const value = texts.qty(qty, unit);
  const tabbable = move === null ? false : move.tabStop === null ? first : move.tabStop === key;

  const activate = (): void => {
    if (move === null) return;
    if (source) {
      move.cancel();
      return;
    }
    if (target) {
      move.drop(zoneId, zoneName);
      return;
    }
    if (!takeable) {
      move.say(texts.grabEmpty(zoneName));
      return;
    }
    move.take({ itemId, itemName, zoneId, zoneName });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Escape') {
      move?.cancel();
      return;
    }

    const step = STEPS[event.key];
    if (step === undefined) return;

    if (focusNeighbour(event.currentTarget, step)) event.preventDefault();
  };

  const onDragStart = (event: DragEvent<HTMLButtonElement>): void => {
    if (!takeable || move === null) {
      event.preventDefault();
      return;
    }

    /* Без данных перетаскивание не начинается в части браузеров; сами данные
       не читаются — что несём, знает состояние раздела. */
    event.dataTransfer.setData('text/plain', itemName);
    event.dataTransfer.effectAllowed = 'move';
    move.take({ itemId, itemName, zoneId, zoneName });
  };

  const onDragOver = (event: DragEvent<HTMLButtonElement>): void => {
    if (!target) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setOver(true);
  };

  const onDrop = (event: DragEvent<HTMLButtonElement>): void => {
    if (!target) return;

    event.preventDefault();
    setOver(false);
    move?.drop(zoneId, zoneName);
  };

  return (
    /* `role` и `data-label` — требование карточного режима таблицы: до 600px
       строка раскладывается в карточку через `display: block`, а он снимает с
       таблицы семантику и прячет шапку (см. Table.tsx). */
    <td
      className={styles.cell}
      role="cell"
      data-label={zoneName}
      /* Метка «это колонка зоны»: карточная раскладка на телефоне собирает из
         таких ячеек ряд чипов, а пустые зоны прячет — четыре нуля подряд
         занимают там место, ничего не сообщая (issue #609). */
      data-zone=""
      data-empty={qty === 0 ? '' : undefined}
    >
      <button
        type="button"
        data-stock-cell={key}
        className={[
          styles.button,
          qty === 0 ? styles.zero : null,
          qty < 0 ? styles.minus : null,
          source ? styles.held : null,
          over ? styles.over : null,
          target ? styles.target : null,
        ]
          .filter(Boolean)
          .join(' ')}
        draggable={takeable}
        tabIndex={tabbable ? 0 : -1}
        aria-label={label({ itemName, zoneName, value, source, target, closed, takeable })}
        aria-pressed={takeable ? source : undefined}
        title={qty < 0 ? texts.minusTitle : undefined}
        onClick={activate}
        onKeyDown={onKeyDown}
        onFocus={() => move?.setTabStop(key)}
        onDragStart={onDragStart}
        onDragEnd={() => move?.cancel()}
        onDragOver={onDragOver}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        {formatQty(qty)}
      </button>
    </td>
  );
}

/**
 * Имя ячейки голосом. Одно число вне таблицы не значит ничего, поэтому в имя
 * входят позиция, зона и то, что с ячейкой можно сделать прямо сейчас.
 */
function label({
  itemName,
  zoneName,
  value,
  source,
  target,
  closed,
  takeable,
}: {
  readonly itemName: string;
  readonly zoneName: string;
  readonly value: string;
  readonly source: boolean;
  readonly target: boolean;
  readonly closed: boolean;
  readonly takeable: boolean;
}): string {
  const head = texts.cellLabel(itemName, zoneName, value);

  if (source) return `${head} — ${texts.cellHeld}`;
  if (target) return `${head} — ${texts.cellDrop}`;
  if (closed) return `${head} — ${texts.cellClosed}`;
  if (takeable) return `${head} — ${texts.cellTake}`;

  return head;
}

/** Шаг по сетке: вправо-влево — соседняя зона, вверх-вниз — соседняя позиция. */
const STEPS: Readonly<Record<string, { readonly dx: number; readonly dy: number }>> = {
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
};

/**
 * Соседняя ячейка ищется по разметке, а не по списку в состоянии: таблицу
 * рисует сервер, и второй её слепок на клиенте разошёлся бы с первой правкой.
 */
function focusNeighbour(from: HTMLElement, step: { dx: number; dy: number }): boolean {
  const cell = from.closest('td');
  if (cell === null) return false;

  const row = cell.parentElement;
  if (row === null) return false;

  const column = [...row.children].indexOf(cell);

  const sibling =
    step.dy === 0
      ? step.dx < 0
        ? cell.previousElementSibling
        : cell.nextElementSibling
      : (step.dy < 0 ? row.previousElementSibling : row.nextElementSibling)?.children[column];

  const next = sibling?.querySelector<HTMLElement>('[data-stock-cell]');
  if (next === null || next === undefined) return false;

  next.focus();
  return true;
}
