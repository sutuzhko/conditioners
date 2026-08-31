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
  /**
   * Полоска затухания у правого края — признак, что таблица шире контейнера
   * (issue #263). Она не обязательна: у таблицы бывает и подпись под ней, и
   * видимая полоса прокрутки, — поэтому проп, а не поведение варианта.
   */
  fade?: boolean | undefined;
  className?: string | undefined;
}

export function Table({
  children,
  variant = 'plain',
  zebra = false,
  caption,
  label,
  minWidth,
  fade = false,
  className,
}: TableProps) {
  const cards = variant === 'cards';

  /* 🔴 `cards` прокручивается наравне с `scroll` и `sticky`. Карточками
     строки лежат только на узком экране; выше порога это обычная таблица из
     шести колонок, и своего контейнера прокрутки у неё не было — каталог
     панели уезжал правым краем на 997 при документе 900, потому что колонку
     разделов никто из бюджета ширины не вычитал (issue #302).

     Контейнер получает фокус и в карточном режиме, где прокручивать нечего.
     Это осознанная плата: `tabIndex` живёт в разметке, а режим — в
     медиа-запросе, и выбор стоит между лишней остановкой табуляции на
     телефоне и таблицей, которую с клавиатуры не прокрутить вовсе. */
  const scrolls = variant === 'scroll' || variant === 'sticky' || cards;

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
      className={[
        styles.viewport,
        styles.scrollable,
        fade ? styles.faded : null,
        cards ? styles.cardsScroll : null,
      ]
        .filter(Boolean)
        .join(' ')}
      role="region"
      aria-label={label}
      tabIndex={0}
    >
      {table}
    </div>
  );
}
