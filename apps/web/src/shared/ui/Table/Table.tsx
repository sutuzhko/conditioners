import type { ReactNode } from 'react';
import styles from './Table.module.css';

export type TableVariant = 'plain' | 'scroll' | 'sticky';

export interface TableProps {
  /** обычные thead и tbody: содержимое строк собирает потребитель */
  children: ReactNode;
  /**
   * plain — таблица по ширине контейнера;
   * scroll — горизонтальный скролл внутри своего контейнера;
   * sticky — то же плюс залипающая первая колонка (сравнение, цены)
   */
  variant?: TableVariant | undefined;
  zebra?: boolean | undefined;
  caption?: ReactNode | undefined;
  /** имя области прокрутки для скринридера: без него скролл-контейнер безымянный */
  label?: string | undefined;
  /** минимальная ширина таблицы, ниже которой включается скролл: «720px» */
  minWidth?: string | undefined;
  className?: string | undefined;
}

export function Table({
  children,
  variant = 'plain',
  zebra = false,
  caption,
  label,
  minWidth,
  className,
}: TableProps) {
  const scrolls = variant !== 'plain';

  const table = (
    <table
      className={[
        styles.table,
        zebra ? styles.zebra : null,
        variant === 'sticky' ? styles.sticky : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={minWidth === undefined ? undefined : { minWidth }}
    >
      {caption === undefined ? null : <caption className={styles.caption}>{caption}</caption>}
      {children}
    </table>
  );

  if (!scrolls) return <div className={styles.viewport}>{table}</div>;

  // контейнер получает tabIndex: прокрутить таблицу вбок должно быть можно
  // и с клавиатуры, а не только пальцем
  return (
    <div
      className={[styles.viewport, styles.scrollable].join(' ')}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {table}
    </div>
  );
}
