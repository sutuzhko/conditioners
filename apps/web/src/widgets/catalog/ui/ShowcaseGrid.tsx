'use client';

import { useState, type ReactNode } from 'react';

import { catalogText } from '../content';
import gridStyles from './grid.module.css';
import styles from './ShowcaseGrid.module.css';

export interface ShowcaseGridProps {
  /** Карточки целиком — их рисует сервер, сюда они приезжают готовыми. */
  readonly children: ReactNode;
  /** Сколько моделей осталось за ограничением: 0 — кнопки нет вовсе. */
  readonly hiddenCount: number;
  /** Имя списка для скринридера: без него это безымянный список из карточек. */
  readonly label: string;
}

/** Кнопка управляет этим списком — `aria-controls` обязан на него ссылаться. */
const LIST_ID = 'showcase-models';

/**
 * Витрина лендинга с раскрытием остальных моделей (issue #260).
 *
 * 🔴 Все карточки лежат в HTML сразу и до раскрытия скрыты стилем (инвариант
 * 1): витрина — товарный контент, и робот обязан увидеть её целиком, не
 * дожидаясь нажатия. Кнопка ничего не грузит, она снимает ограничение.
 *
 * Клиентский компонент — ровно один и самый мелкий из возможных: состояние
 * тут одно булево. Разворачивание через скрытую галочку с `<label>` обошлось
 * бы без JavaScript вовсе, но скринридер объявлял бы кнопку раскрытия
 * галочкой, а `aria-expanded` у неё не бывает. Цена вопроса — меньше
 * килобайта в бюджете (ADR-088), и она за настоящую кнопку с состоянием.
 *
 * Кнопка остаётся на месте после раскрытия и сворачивает список обратно:
 * исчезающая кнопка уносит с собой фокус, и человек с клавиатуры оказывается
 * в начале документа.
 */
export function ShowcaseGrid({ children, hiddenCount, label }: ShowcaseGridProps) {
  const [open, setOpen] = useState(false);

  if (hiddenCount <= 0) {
    return (
      <ul id={LIST_ID} className={gridStyles.grid} aria-label={label}>
        {children}
      </ul>
    );
  }

  return (
    <>
      <ul
        id={LIST_ID}
        className={open ? gridStyles.grid : `${gridStyles.grid} ${gridStyles.clipped}`}
        aria-label={label}
      >
        {children}
      </ul>
      <div className={styles.row}>
        <button
          type="button"
          className={styles.more}
          aria-expanded={open}
          aria-controls={LIST_ID}
          onClick={() => setOpen((was) => !was)}
        >
          {/* 🔴 Число берётся из данных, а не пишется: моделей на витрине
              столько, сколько владелец вынес флагом `featured` (ADR-109). */}
          {open ? catalogText.collapse : catalogText.moreModels(hiddenCount)}
        </button>
      </div>
    </>
  );
}
