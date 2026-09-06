import type { ReactNode } from 'react';

import { formatPhone, phoneHref } from '@/shared/lib/format';
import {
  Avatar,
  Badge,
  EmptyState,
  Icon,
  Pager,
  Table,
  TableActionLink,
  TableActions,
  type BadgeVariant,
} from '@/shared/ui';

import { adminSummaryContent as texts } from './summary-content';
import {
  SUMMARY_PATH,
  upcomingQuery,
  visibleUpcomingColumns,
  type UpcomingColumn,
  type UpcomingFilters,
} from './summary-list';
import styles from './SummaryTable.module.css';

/**
 * 🔴 Наряд и дело — разные сущности с разным смыслом (ADR-093): наряд это
 * работа с деньгами и исполнителем, дело — напоминание позвонить. В общем
 * списке они идут вперемешку по времени, но помечены по-разному: сводка, в
 * которой одно неотличимо от другого, врёт о том, что предстоит сделать.
 */
export type UpcomingNature = 'order' | 'event';

/** Адрес строки: путь и параметры отдельно — маршруты в проекте типизированы. */
export type SummaryHref = {
  readonly pathname: string;
  readonly query?: Record<string, string> | undefined;
};

/**
 * Строка «Ближайших дел» в том виде, в каком её показывает сводка.
 *
 * Все подписи приходят готовыми: сводка не знает ни видов дел, ни типов
 * нарядов, ни часового пояса работ — за них отвечают их разделы.
 */
export type UpcomingItem = {
  readonly id: string;
  readonly nature: UpcomingNature;
  /** ISO момента — значение `datetime` у `time`. */
  readonly at: string;
  /** День словами: «сегодня», «завтра», «пт, 31 июля». */
  readonly day: string;
  /** Время и длительность: «14:00 · 3 ч». */
  readonly clock: string;
  /** Что это: «Монтаж», «Звонок». */
  readonly kind: string;
  /** Клиент и объект: «Ирина Соколова · Тула, Оборонная 12». */
  readonly place: string;
  readonly clientName: string;
  /** Телефон клиента. У дела его может не быть — тогда и звонить неоткуда. */
  readonly clientPhone: string | null;
  /**
   * Исполнитель. `null` у наряда означает «некому ехать», у дела —
   * «исполнителя не бывает»: различает их природа строки, а не это поле.
   */
  readonly installerName: string | null;
  readonly statusTitle: string;
  readonly statusVariant: BadgeVariant;
  /** Сумма наряда. У дела денег нет вовсе. */
  readonly sum: string | null;
  /** Куда ведёт «Открыть»: наряд — в карточку, дело — в день календаря. */
  readonly href: SummaryHref;
  /** День календаря этой строки: `/admin/crm?day=…&view=day`. */
  readonly dayHref: SummaryHref;
  /** Номер наряда — для подписи действия. У дела номера нет. */
  readonly number: number | null;
  readonly overdue: boolean;
};

export interface SummaryTableProps {
  readonly items: readonly UpcomingItem[];
  readonly filters: UpcomingFilters;
  readonly page: number;
  readonly pages: number;
}

const TITLE: Readonly<Record<UpcomingColumn, string>> = {
  when: texts.colWhen,
  work: texts.colWork,
  installer: texts.colInstaller,
  status: texts.colStatus,
  sum: texts.colSum,
};

/* 🔴 Класс колонки стоит и на шапке, и на ячейке: медиа-запрос прячет колонку
   целиком, а `th` без пары `td` оставил бы таблицу с разъехавшимися столбцами.
   Значение допускает `undefined`: при `noUncheckedIndexedAccess` имя из
   CSS-модуля всегда `string | undefined`, и `filter(Boolean)` ниже гасит его
   вместо пустого `class=""`. */
const CLASS: Readonly<Record<UpcomingColumn, string | undefined>> = {
  when: styles.whenCol,
  work: styles.workCol,
  installer: styles.installerCol,
  status: styles.statusCol,
  sum: styles.sumCol,
};

/**
 * «Ближайшие дела» таблицей (issue #591, макет «Обзор»).
 *
 * 🔴 Серверный компонент: отбор, порядок, состав колонок и страница живут в
 * адресе, а действия строки — ссылки. Своего JS у таблицы ноль, и это не
 * бережливость ради бережливости: на том же экране стоят два графика, и
 * бюджет собственного слоя тратится на них, а не на список, который прекрасно
 * рисует сервер.
 *
 * 🔴 Ниже 600 строки становятся карточками — это умеет сам `Table`; отсюда
 * `data-label` на каждой ячейке и явные роли на `tr` и `td`.
 */
export function SummaryTable({ items, filters, page, pages }: SummaryTableProps) {
  const columns = visibleUpcomingColumns(filters.hidden);

  /* 🔴 Пустой отбор и пустой план — разные новости, и шаги у них
     противоположные: снять условие либо завести первую работу. Один текст на
     оба случая заводит владельца в тупик. */
  const untouched = filters.show === 'all' && filters.query === '';

  if (items.length === 0) {
    return (
      <EmptyState
        icon="calendar"
        title={untouched ? texts.upcomingEmptyTitle : texts.upcomingNotFoundTitle}
        className={styles.empty}
      >
        {untouched ? texts.upcomingEmpty : texts.upcomingNotFound}
      </EmptyState>
    );
  }

  return (
    <>
      <Table className={styles.table} variant="cards" label={texts.tableLabel} fade>
        <thead>
          <tr role="row">
            {columns.map((column) => (
              <th className={CLASS[column]} key={column} scope="col">
                {TITLE[column]}
              </th>
            ))}

            {/* Имя колонки действий читалке нужно, а на экране оно только
                повторяет подписанные значки под собой. */}
            <th className={styles.actionsCol} scope="col">
              <span className="srOnly">{texts.colActions}</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <Row key={`${item.nature}-${item.id}`} item={item} columns={columns} />
          ))}
        </tbody>
      </Table>

      <Pager
        page={page}
        pages={pages}
        basePath={SUMMARY_PATH}
        query={upcomingQuery({ ...filters, page: 1 })}
        label={texts.pagerLabel}
        position={texts.pagerPosition}
        numbers
      />
    </>
  );
}

function Row({
  item,
  columns,
}: {
  readonly item: UpcomingItem;
  readonly columns: readonly UpcomingColumn[];
}) {
  /* 🔴 Подпись действия называет свою строку, а не колонку: восемь одинаковых
     «Открыть» подряд читалке бесполезны — они не говорят, что открывается. */
  const title = `${item.kind} · ${item.clientName}`;

  /* Просроченная строка подсвечена тинтом: `data-danger` объявлен китом ровно
     для этого — он же снимает заливку у плашек, чтобы тинт не сложился дважды. */
  return (
    <tr role="row" {...(item.overdue ? { 'data-danger': '' } : {})}>
      {columns.map((column) => (
        <Cell key={column} column={column} item={item} />
      ))}

      <td className={styles.actions} role="cell">
        <TableActions label={texts.rowActions(title)}>
          <TableActionLink
            className={styles.action}
            href={item.href}
            tone="open"
            label={
              item.number === null ? texts.rowOpenEvent(title) : texts.rowOpenOrder(item.number)
            }
            icon={<Icon name="eye" size={18} />}
          />

          {/* Позвонить — второе по частоте действие над строкой: «где вы?»
              спрашивают из списка, не открывая наряд. Дело без телефона его не
              получает: ссылка `tel:` в никуда — это кнопка, которая не работает. */}
          {item.clientPhone === null ? null : (
            <a
              className={styles.phone}
              href={phoneHref(item.clientPhone)}
              aria-label={texts.rowCall(item.clientName)}
            >
              <span aria-hidden="true" title={formatPhone(item.clientPhone)}>
                <Icon name="phone" size={18} />
              </span>
            </a>
          )}

          {/* 🔴 Третьим действием стоит переход в день календаря, а не удаление
              из макета: решение удалить наряд принимают в его карточке, где
              видны клиент, сумма и история, — а «Обзор» этих данных не
              показывает. Полный набор действий над нарядом живёт в «Заказах».
              Отступление записано в PIXEL_SPEC §«Панель». */}
          {item.nature === 'order' ? (
            <TableActionLink
              className={styles.action}
              href={item.dayHref}
              tone="open"
              label={texts.rowDay(title)}
              icon={<Icon name="calendar" size={18} />}
            />
          ) : null}
        </TableActions>
      </td>
    </tr>
  );
}

function Cell({ column, item }: { readonly column: UpcomingColumn; readonly item: UpcomingItem }) {
  const cell = (extra: string | undefined, children: ReactNode): ReactNode => (
    <td
      className={[CLASS[column], extra].filter(Boolean).join(' ')}
      role="cell"
      data-label={TITLE[column]}
    >
      {children}
    </td>
  );

  switch (column) {
    case 'when':
      return cell(
        undefined,
        <time className={styles.when} dateTime={item.at}>
          <span className={styles.day}>{item.day}</span>
          <span className={styles.clock}>{item.clock}</span>
        </time>,
      );

    case 'work':
      /* 🔴 Одна обёртка на всё содержимое ячейки. В карточном режиме кита
         ячейка становится флексом с подписью слева, и три блока подряд
         вставали бы тремя колонками шириной в букву. */
      return cell(
        undefined,
        <span className={styles.workBox}>
          <span className={styles.kindRow}>
            <span className={styles.kind}>{item.kind}</span>
            {/* Природа записи — словом и плашкой, а не одним цветом: наряд и
                дело различаются деньгами, и путать их нельзя даже в
                монохромном режиме. */}
            <Badge size="sm" variant={item.nature === 'order' ? 'accent' : 'neutral'}>
              {texts.natureTitle(item.nature)}
            </Badge>
          </span>
          <span className={styles.place}>{item.place}</span>
        </span>,
      );

    case 'installer':
      return cell(
        undefined,
        item.installerName === null ? (
          <span className={styles.none}>
            {item.nature === 'order' ? texts.installerNone : texts.installerNever}
          </span>
        ) : (
          /* Аватар-инициалы рядом с именем (макет «Обзор»): в списке из восьми
             строк бригаду различают по кружку, а не вычитывают имена. */
          <span className={styles.person}>
            <Avatar name={item.installerName} size="sm" />
            <span className={styles.personName}>{item.installerName}</span>
          </span>
        ),
      );

    case 'status':
      return cell(
        undefined,
        <Badge size="sm" variant={item.statusVariant} dot>
          {item.statusTitle}
        </Badge>,
      );

    case 'sum':
      return cell(item.sum === null ? styles.none : styles.money, item.sum ?? texts.sumNone);
  }
}
