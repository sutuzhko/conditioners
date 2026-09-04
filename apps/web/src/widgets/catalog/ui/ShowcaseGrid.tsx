'use client';

import { useState, type ReactNode } from 'react';

import { catalogText } from '../content';
import { showcaseReveal } from '../model';
import gridStyles from './grid.module.css';
import styles from './ShowcaseGrid.module.css';

export interface ShowcaseGridProps {
  /** Карточки целиком — их рисует сервер, сюда они приезжают готовыми. */
  readonly children: ReactNode;
  /**
   * Сколько карточек в списке — всех, а не оставшихся за пределом.
   *
   * 🔴 Именно всех (issue #552): остаток зависит от того, сколько карточек
   * показано, а это число разное на разных ширинах. Сервер ширины не знает и
   * знать не должен (инвариант 1), поэтому считать остаток ему нечем.
   */
  readonly total: number;
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
 *
 * 🔴 Подпись кнопки называет весь список, а не остаток (issue #552). Пока в
 * ней стояло «Ещё N», число N зависело от того, сколько карточек показано, —
 * а показано их разное количество на разных ширинах, и серверное N было
 * верным не везде. Развязав подпись от предела, витрина смогла гасить
 * карточки по порогам и не оставлять последний ряд неполным.
 */
export function ShowcaseGrid({ children, total, label }: ShowcaseGridProps) {
  const [open, setOpen] = useState(false);
  const reveal = showcaseReveal(total);

  if (reveal === 'none') {
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
      {/* 🔴 Ряд помечен диапазоном, а не спрятан здесь: где именно кнопка
          нужна, зависит от ширины окна, а разметку собирает сервер
          (инвариант 1). Атрибут говорит стилю, убирать ли кнопку там, где
          показаны уже все карточки. */}
      <div className={styles.row} data-reveal={reveal}>
        <button
          type="button"
          className={styles.more}
          aria-expanded={open}
          aria-controls={LIST_ID}
          onClick={() => setOpen((was) => !was)}
        >
          {/* 🔴 Число берётся из данных, а не пишется: моделей на витрине
              столько, сколько владелец вынес флагом `featured` (ADR-109). */}
          {open ? catalogText.collapse : catalogText.showAll(total)}
        </button>
      </div>
    </>
  );
}
