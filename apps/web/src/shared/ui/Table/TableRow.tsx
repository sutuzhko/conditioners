import Link from 'next/link';
import type { ComponentProps, HTMLAttributes, ReactNode } from 'react';

import styles from './TableRow.module.css';

/**
 * Класс кита плюс класс раздела — и класс раздела идёт первым.
 *
 * 🔴 Порядок здесь не про CSS, где он не значит ничего, а про измерения
 * раскладки (ADR-234): узел в снимке называется **первым** классом-модулем
 * (`e2e/vr/measurements/collect.ts`). Поставь китовый класс вперёд — и адрес
 * очереди станет в диффе безымянным `span.TableRow__above`, одинаковым во
 * всех разделах сразу.
 */
function rowClassName(own: string | undefined, outer: string | undefined): string {
  return [outer, own].filter(Boolean).join(' ');
}

export interface TableRowProps extends Omit<
  HTMLAttributes<HTMLTableRowElement>,
  'children' | 'className' | 'role'
> {
  readonly children: ReactNode;
  /**
   * Строка открыта — та, чью карточку сейчас показывают рядом.
   *
   * 🔴 Кит от этого только перестаёт подсвечивать её наведением: её заливка
   * сообщает о другом. Как выглядит открытая строка — решает раздел, потому
   * что «открытая» есть не у каждого списка.
   */
  readonly current?: boolean | undefined;
  readonly className?: string | undefined;
}

/**
 * Строка списка, которая нажимается целиком (issue #740).
 *
 * 🔴 Владелец целится в тему и во время и не попадает никуда: строка
 * выглядит целью, целью не являясь, — нажимается в ней одна подпись. Ниже
 * 600px, где строка разворачивается карточкой на пол-экрана, это особенно
 * заметно.
 *
 * Площадь строке отдаёт растянутое перекрытие `TableRowLink`, поэтому целей
 * у строки не прибавляется: клавиатура и озвучка получают одну остановку с
 * подписью, называющей запись, а не по остановке на ячейку.
 *
 * `role="row"` ставится всегда: ниже 600px `variant="cards"` раскладывает
 * строки через `display: block`, а он снимает с таблицы её семантику.
 */
export function TableRow({ children, current = false, className, ...rest }: TableRowProps) {
  return (
    <tr
      {...rest}
      role="row"
      className={rowClassName(styles.row, className)}
      /* Признак читается и китом (подсветка наведения), и разделом (краска
         открытой строки), поэтому он атрибут, а не имя класса модуля. */
      data-current={current ? '' : undefined}
    >
      {children}
    </tr>
  );
}

/** Пропсы наследуем у самого Link: маршруты типизированы, и адрес обязан
    проверяться компилятором. */
type NextLinkProps = ComponentProps<typeof Link>;

export interface TableRowLinkProps extends Omit<
  NextLinkProps,
  'aria-label' | 'children' | 'className'
> {
  /**
   * Полная подпись строки для озвучки: «Обращение № 12, Жуков Кирилл».
   *
   * 🔴 Видимого текста мало. Ссылка в строке одна, а читалка читает список
   * ссылок подряд: «Жуков Кирилл, Белова Ирина, Соколов Пётр» — это перечень
   * людей, а не перечень записей, и номера, которым запись называют вслух, в
   * нём нет вовсе. Видимый текст обязан входить в подпись (WCAG 2.5.3):
   * голосовой доступ ищет строку по тому, что видно.
   */
  readonly label: string;
  /** Видимый текст ссылки — главное значение строки. */
  readonly children: ReactNode;
  readonly className?: string | undefined;
}

/**
 * Ссылка, отдающая свою площадь всей строке (issue #740).
 *
 * 🔴 Ссылка одна на строку. Вторая — на ячейке — не добавила бы ни одного
 * нового адреса, зато удвоила бы список целей; кнопку меню строки в ссылку
 * не вложить вовсе: это интерактив внутри интерактива.
 *
 * Что остаётся выше перекрытия — действия строки и то, что из неё копируют, —
 * решает раздел классом `tableAboveClassName`.
 */
export function TableRowLink({ label, children, className, href, ...rest }: TableRowLinkProps) {
  return (
    <Link {...rest} href={href} className={rowClassName(styles.link, className)} aria-label={label}>
      {children}
    </Link>
  );
}

/**
 * Класс для того, что обязано остаться выше перекрытия строки: меню
 * действий, телефон, адрес, который копируют. Функция, а не строка, — как
 * `buttonClassName`: она же приписывает к нему собственный класс раздела.
 *
 * 🔴 Ставится вызывающим, а не китом: какая ячейка поднята — знает раздел.
 * Поднятое перестаёт открывать строку, поэтому поднимать всё подряд нельзя:
 * ниже 600px ячейка разворачивается в полосу во всю ширину карточки и
 * отнимает у строки заметный кусок площади.
 */
export function tableAboveClassName(className?: string | undefined): string {
  return rowClassName(styles.above, className);
}
