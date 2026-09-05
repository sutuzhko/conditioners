import Link from 'next/link';
import type { ReactNode } from 'react';

import { formatPhone, phoneHref } from '@/shared/lib/format';
import { Avatar, Badge, ButtonLink, Icon, Table, TableActions } from '@/shared/ui';

import {
  ORDER_CANCEL_REASON_TITLE,
  ORDER_STATUS_TITLE,
  ORDER_STATUS_VARIANT,
  ORDER_TYPE_TITLE,
  orderManagerContent as texts,
} from './content';
import type { OrderColumn, OrderRowAction } from './columns';
import { BULK_FIELD, BULK_FORM_ID, ORDERS_PATH, installerName, type OrderCard } from './model';
import { OrderRemoveButton, OrderRestoreButton } from './OrderRowTools';
import styles from './OrderTable.module.css';

export interface OrderTableProps {
  readonly items: readonly OrderCard[];
  /** Видимые колонки в порядке показа — набор вкладки (issue #597). */
  readonly columns: readonly OrderColumn[];
  /** Действие вкладки в строке: назначить у новых, вернуть в работу у отказов. */
  readonly rowAction?: OrderRowAction | null | undefined;
  /** Галочка выбора первой колонкой. Имя поля общее с групповым действием. */
  readonly selectable?: boolean | undefined;
  /**
   * Экран монтажника: колонки «Сумма» у него нет вовсе. Сумма наряда — не его
   * данные (CRM.md §3.1), а колонка из прочерков занимала бы место, ничего не
   * сообщая: наличные, которые нужно принять, стоят в самой карточке.
   */
  readonly forInstaller?: boolean | undefined;
  /**
   * Момент, относительно которого считается просрочка. Приходит снаружи, а не
   * берётся из часов внутри: иначе снимок истории менялся бы каждый день, а
   * тест зависел бы от даты прогона.
   */
  readonly now?: string | undefined;
}

/** Просрочен — время выезда прошло, а работа не закончена и не отменена. */
function isOverdue(order: OrderCard, now: number): boolean {
  if (order.status === 'done' || order.status === 'cancelled') return false;
  return Date.parse(order.at) < now;
}

/** Подпись колонки. Ниже 600 она же становится подписью поля в карточке. */
const TITLE: Readonly<Record<OrderColumn, string>> = {
  number: texts.colNumber,
  type: texts.colType,
  client: texts.colWork,
  source: texts.colSource,
  created: texts.colCreated,
  installer: texts.colInstaller,
  when: texts.colWhen,
  closed: texts.colClosed,
  declined: texts.colDeclined,
  reason: texts.colReason,
  status: texts.colStatus,
  sum: texts.colSum,
};

/**
 * Ширина и порог, ниже которого колонка уходит в подпись работы.
 *
 * 🔴 Уходит, а не сжимается: колонка, ужатая до двух слов с переносом,
 * читается хуже строки под названием, и вся раскладка таблицы держится на
 * том, что узкие экраны показывают меньше колонок, а не более тесные.
 */
/* 🔴 Значение допускает `undefined` не по неряшливости: при
   `noUncheckedIndexedAccess` имя из CSS-модуля всегда `string | undefined` —
   компилятор не знает, какие классы в модуле есть. Так же объявлен
   `GROUP_CLASS` у аватара. Отсутствие класса гасит `filter(Boolean)` ниже, а
   не роняет строку пустым `class=""`. */
const CLASS: Readonly<Record<OrderColumn, string | undefined>> = {
  number: styles.numberCol,
  type: styles.typeCol,
  client: styles.clientCol,
  source: styles.sourceCol,
  created: styles.dateCol,
  installer: styles.installerCol,
  when: styles.dateCol,
  closed: styles.dateCol,
  declined: styles.dateCol,
  reason: styles.reasonCol,
  status: styles.statusCol,
  sum: styles.sumCol,
};

/**
 * Наряды таблицей (issue #345, #597).
 *
 * 🔴 Серверный компонент: переход между стопками, страницами и открытие
 * наряда — это адреса, а не состояние. Клиентского JS в строке ровно столько,
 * сколько требуют необратимые действия: удаление и возврат отказа в работу
 * спрашивают подтверждение (`OrderRowTools`), всё остальное — ссылки.
 *
 * 🔴 Состав колонок приходит пропом, а не решается здесь пятью ветками:
 * вкладка меняет не только фильтр, но и набор колонок (макет `OrdersTabs`), и
 * пять таблиц разошлись бы между собой на первой же общей правке.
 *
 * Ниже 1200 узкие колонки уходят в подпись работы, ниже 600 строки становятся
 * карточками — это умеет сам `Table`.
 */
export function OrderTable({
  items,
  columns,
  rowAction = null,
  selectable = false,
  forInstaller = false,
  now,
}: OrderTableProps) {
  const moment = now === undefined ? Date.now() : Date.parse(now);

  /* Сумма — не данные монтажника (CRM.md §3.1). Колонку снимает набор, а не
     ячейка: иначе шапка обещала бы столбец, которого в строках нет. */
  const shown = columns.filter((column) => !(forInstaller && column === 'sum'));

  return (
    /* 🔴 Нижняя ширина таблицы живёт в модуле, а не в пропе `minWidth`: проп
       ставит её стилем на самой таблице, а в карточном режиме (до 600px)
       строки уже разложены по вертикали — и 760px превращались в карточку
       вдвое шире экрана, у которой сумма и статус уезжали за правый край.
       В модуле то же число стоит под порогом 600. */
    <Table className={styles.table} variant="cards" label={texts.tableLabel} fade>
      <thead>
        <tr role="row">
          {selectable ? (
            <th className={styles.pickCol} scope="col">
              {/* Выбор всей страницы — кнопка группового действия, а не
                  заголовок: она живёт в полосе над таблицей, где видно, что
                  именно с выбранным можно сделать. */}
              <span className="srOnly">{texts.colSelect}</span>
            </th>
          ) : null}

          {shown.map((column) => (
            <th className={CLASS[column]} key={column} scope="col">
              {TITLE[column]}
            </th>
          ))}

          {/* Действие вкладки — своя колонка с подписью, как в макете: у
              «Новых» это «Назначить», у «Отказов» — «Вернуть в работу». Оба
              решения владельца, монтажнику их не показывают (CRM.md §6). */}
          {rowAction === null || forInstaller ? null : (
            <th className={styles.tabActionCol} scope="col">
              {texts.colAction}
            </th>
          )}

          {/* Имя колонки круглых действий читалке нужно, а на экране оно
              только повторяет подписанные значки под собой. */}
          <th className={styles.actionsCol} scope="col">
            <span className="srOnly">{texts.colActions}</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {items.map((order) => (
          <Row
            key={order.id}
            order={order}
            columns={shown}
            rowAction={rowAction}
            selectable={selectable}
            forInstaller={forInstaller}
            overdue={isOverdue(order, moment)}
          />
        ))}
      </tbody>
    </Table>
  );
}

function Row({
  order,
  columns,
  rowAction,
  selectable,
  forInstaller,
  overdue,
}: {
  readonly order: OrderCard;
  readonly columns: readonly OrderColumn[];
  readonly rowAction: OrderRowAction | null;
  readonly selectable: boolean;
  readonly forInstaller: boolean;
  readonly overdue: boolean;
}) {
  const path = `${ORDERS_PATH}/${order.id}`;

  return (
    /* 🔴 Строка срыва подсвечена тинтом, и на нём тинт складывался бы дважды:
       подложка строки плюс подложка плашки. Класс поднимает приглушённый текст
       на ступень и снимает заливку у плашек — `--badge-fill` объявлен китом
       ровно для этого случая (issue #347). */
    <tr className={overdue ? styles.rowbad : undefined} role="row">
      {selectable ? (
        <td className={styles.pick} role="cell" data-label={texts.colSelect}>
          {/* 🔴 Обычный `input` без единой строки своего JS: галочки связаны с
              полосой группового действия атрибутом `form`, и таблица остаётся
              серверной. Имя поля одно на все строки — так его читает
              `FormData` (issue #596). */}
          <input
            className={styles.pickBox}
            type="checkbox"
            name={BULK_FIELD}
            value={order.id}
            form={BULK_FORM_ID}
            aria-label={texts.rowSelect(order.number)}
          />
        </td>
      ) : null}

      {columns.map((column) => (
        <Cell
          key={column}
          column={column}
          order={order}
          path={path}
          overdue={overdue}
          hasInstallerColumn={columns.some((item) => item === 'installer')}
          hasSumColumn={columns.some((item) => item === 'sum')}
        />
      ))}

      {rowAction === null || forInstaller ? null : (
        <td className={styles.tabAction} role="cell" data-label={texts.colAction}>
          {rowAction === 'assign' ? (
            /* «Назначить» ведёт в карточку наряда, где стоит выбор монтажника
               и видна занятость бригад (ADR-115). Отдельного окна назначения
               нет намеренно: выбирать исполнителя вслепую, не видя, кто в этот
               день занят, — ровно тот способ, которым переносят выезды. */
            <ButtonLink
              href={{ pathname: path }}
              size="sm"
              variant="flat"
              aria-label={texts.assignRowLabel(order.number)}
            >
              {texts.assignRow}
            </ButtonLink>
          ) : (
            <OrderRestoreButton orderId={order.id} number={order.number} />
          )}
        </td>
      )}

      <td className={styles.actions} role="cell">
        <TableActions label={texts.rowActions(order.number)}>
          <Link
            className={styles.action}
            href={{ pathname: path }}
            aria-label={texts.rowOpen(order.number)}
          >
            <span aria-hidden="true" title={texts.rowOpen(order.number)}>
              <Icon name="orders" size={18} />
            </span>
          </Link>

          {/* Позвонить — второе по частоте действие над строкой: «где вы?»
              спрашивают из списка, не открывая наряд. */}
          <a
            className={styles.action}
            href={phoneHref(order.client.phone)}
            aria-label={texts.rowCall(order.client.name)}
          >
            <span aria-hidden="true" title={formatPhone(order.client.phone)}>
              <Icon name="phone" size={18} />
            </span>
          </a>

          {/* 🔴 Удаление — необратимое, и только ради подтверждения окном кита
              (ADR-113) в серверной строке появляется клиентский код. Монтажнику
              удаление не положено: это решение владельца (CRM.md §6). */}
          {forInstaller ? null : <OrderRemoveButton orderId={order.id} number={order.number} />}
        </TableActions>
      </td>
    </tr>
  );
}

/**
 * Ячейка колонки.
 *
 * Одна ветка на колонку и никакой общей «универсальной» ячейки: у номера своя
 * ссылка, у монтажника — аватар, у суммы — моноширинные цифры по правому краю.
 * Свести их к одному виду значит потерять ровно то, ради чего колонки разные.
 */
function Cell({
  column,
  order,
  path,
  overdue,
  hasInstallerColumn,
  hasSumColumn,
}: {
  readonly column: OrderColumn;
  readonly order: OrderCard;
  readonly path: string;
  readonly overdue: boolean;
  readonly hasInstallerColumn: boolean;
  readonly hasSumColumn: boolean;
}) {
  const label = TITLE[column];

  /* Что уезжает в подпись работы ниже 1200: только те колонки, которые там
     действительно прячутся. Список собирается из набора вкладки, а не
     угадывается — иначе подпись обещала бы монтажника у стопки, где его
     колонки нет вовсе. */
  const compact = [
    ...(hasInstallerColumn
      ? [order.installer === null ? texts.installerNone : installerName(order.installer)]
      : []),
    ...(hasSumColumn && order.price !== undefined ? [texts.money(order.price)] : []),
  ];

  /* 🔴 Класс колонки стоит и на шапке, и на ячейке: медиа-запрос прячет
     колонку целиком, а `th` без пары `td` оставил бы таблицу с разъехавшимися
     столбцами. Второй класс — только оформление содержимого. */
  const cell = (extra: string | undefined, children: ReactNode): ReactNode => (
    <td className={[CLASS[column], extra].filter(Boolean).join(' ')} role="cell" data-label={label}>
      {children}
    </td>
  );

  switch (column) {
    case 'number':
      return cell(
        undefined,
        <Link className={`${styles.numberLink} tapAction`} href={{ pathname: path }}>
          {texts.number(order.number)}
        </Link>,
      );

    case 'type':
      return cell(undefined, <Badge size="sm">{ORDER_TYPE_TITLE[order.type]}</Badge>);

    case 'client':
      return cell(
        undefined,
        /* 🔴 Одна обёртка на всё содержимое ячейки. В карточном режиме кита
           ячейка становится флексом с подписью слева, и три блока подряд
           вставали бы тремя колонками шириной в букву. */
        <span className={styles.workBox}>
          <span className={styles.client}>{order.client.name}</span>
          <span className={styles.address}>{order.address}</span>
          {order.heightWorks ? (
            <Badge size="sm" variant="warning">
              {texts.heightWorks}
            </Badge>
          ) : null}

          {/* Исполнитель и сумма строкой под работой — там, где своих колонок
              у них не остаётся. Узел один и тот же на всех ширинах: подпись
              прячется медиа-запросом, а не вторым набором данных, который
              однажды разойдётся с первым. Дата колонкой остаётся везде: без
              неё список активных работ перестаёт быть планом. */}
          {compact.length === 0 ? null : (
            <span className={styles.compact}>{compact.join(' · ')}</span>
          )}
        </span>,
      );

    case 'source':
      return cell(
        undefined,
        order.leadId === null ? (
          <span className={styles.none}>{texts.sourceManual}</span>
        ) : (
          <Badge size="sm" variant="neutral">
            {texts.sourceFrom}
          </Badge>
        ),
      );

    case 'installer':
      return cell(
        undefined,
        order.installer === null ? (
          <span className={styles.none}>{texts.installerNone}</span>
        ) : (
          /* Аватар-инициалы рядом с именем (макет «Заказы»): в списке из
             восьми строк бригаду различают по кружку, а не вычитывают имена. */
          <span className={styles.person}>
            <Avatar name={installerName(order.installer)} size="sm" />
            <span className={styles.personName}>{installerName(order.installer)}</span>
          </span>
        ),
      );

    case 'when':
      return cell(
        overdue ? styles.whenBad : undefined,
        <time dateTime={order.at}>
          {texts.date(order.at)}
          <span className={styles.clock}>{texts.clock(order.at)}</span>
        </time>,
      );

    case 'created':
      return cell(undefined, <time dateTime={order.createdAt}>{texts.date(order.createdAt)}</time>);

    case 'closed':
      /* Когда закрыли: момент заполнения итога, а не дата выезда. Итога может
         не быть — работу закрывает и сам владелец, — и тогда остаётся день
         работы: он ближе к правде, чем прочерк. */
      return cell(
        undefined,
        <time dateTime={order.resultAt ?? order.at}>{texts.date(order.resultAt ?? order.at)}</time>,
      );

    case 'declined':
      return cell(
        undefined,
        order.cancelledAt === null ? (
          <span className={styles.none}>{texts.moneyNone}</span>
        ) : (
          <time dateTime={order.cancelledAt}>{texts.date(order.cancelledAt)}</time>
        ),
      );

    case 'reason':
      return cell(
        undefined,
        <span className={styles.workBox}>
          <span className={styles.reasonTitle}>
            {order.cancelReason === null
              ? texts.moneyNone
              : ORDER_CANCEL_REASON_TITLE[order.cancelReason]}
          </span>
          {order.cancelNote === null ? null : (
            <span className={styles.address}>{order.cancelNote}</span>
          )}
        </span>,
      );

    case 'status':
      return cell(
        undefined,
        /* 🔴 Плашка лежит в своей обёртке, а не растягивает саму ячейку
           флексом: `display: flex` на `td` выводит ячейку из табличной
           раскладки, и колонка перестаёт держать общую ширину. Отсюда же
           одинаковая координата плашки во всех строках (issue #345). */
        <span className={styles.statusBox}>
          <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
            {ORDER_STATUS_TITLE[order.status]}
          </Badge>
          {/* Просрочка — отдельная отметка рядом со статусом: словарь статусов
              от неё не растёт, а координата самой плашки не двигается. */}
          {overdue ? (
            <Badge size="sm" variant="danger">
              {texts.overdueMark}
            </Badge>
          ) : null}
          {order.overtimeMin > 0 ? (
            <span className={styles.overtime}>{texts.overtime(order.overtimeMin)}</span>
          ) : null}
        </span>,
      );

    case 'sum':
      return cell(
        undefined,
        order.price === undefined ? texts.moneyNone : texts.money(order.price),
      );
  }
}
