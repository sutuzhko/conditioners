import type { ReactNode } from 'react';
import styles from './Table.module.css';

export type TableVariant = 'plain' | 'scroll' | 'sticky' | 'cards';

export interface TableProps {
  /** обычные thead и tbody: содержимое строк собирает потребитель */
  children: ReactNode;
  /**
   * plain — таблица по ширине контейнера;
   * scroll — горизонтальный скролл внутри своего контейнера;
   * sticky — то же плюс залипающая первая колонка (сравнение, цены);
   * cards — на узком экране строки становятся карточками.
   *
   * 🔴 `cards` требует от потребителя двух вещей: `data-label` на каждой
   * ячейке (из него берётся подпись, когда шапка скрыта) и явных `role` на
   * `tr` и `td`. Роли обязательны потому, что раскладка карточками сделана
   * через `display: block`, а он снимает с таблицы её семантику: без ролей
   * скринридер на телефоне перестаёт понимать, где строка, а где ячейка.
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
  const cards = variant === 'cards';
  const scrolls = variant === 'scroll' || variant === 'sticky';

  const table = (
    <table
      className={[
        styles.table,
        zebra ? styles.zebra : null,
        variant === 'sticky' ? styles.sticky : null,
        cards ? styles.cards : null,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      /* роль вернётся сама на широком экране, но `display: block` в узком её
         снимает — проще объявить её один раз, чем зависеть от раскладки */
      role={cards ? 'table' : undefined}
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
