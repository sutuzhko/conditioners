import type { ReactNode } from 'react';

import styles from './TableActions.module.css';

export interface TableActionsProps {
  /**
   * Круглые действия строки — до трёх. Больше трёх не помещается в колонку
   * и уводит взгляд от самих данных: четвёртое и дальше уходят в меню строки.
   */
  readonly children: ReactNode;
  /** Имя группы для озвучки: «Действия над нарядом № 1059». */
  readonly label: string;
  readonly className?: string | undefined;
}

/**
 * Правая колонка действий строки таблицы (issue #329).
 *
 * 🔴 Действия видны всегда, а не проявляются по наведению. Наведения нет ни
 * на телефоне, ни у клавиатуры, и спрятанное за ним действие для половины
 * способов ввода не существует вовсе. Приглушены они цветом, а не
 * прозрачностью: прозрачный значок на тинте строки срыва теряет контраст.
 */
export function TableActions({ children, label, className }: TableActionsProps) {
  return (
    <div
      className={[styles.actions, className].filter(Boolean).join(' ')}
      role="group"
      aria-label={label}
    >
      {children}
    </div>
  );
}
