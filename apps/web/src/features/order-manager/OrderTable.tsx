import Link from 'next/link';

import { formatPhone, phoneHref } from '@/shared/lib/format';
import { Badge, Icon, Table, TableActions } from '@/shared/ui';

import {
  ORDER_STATUS_TITLE,
  ORDER_STATUS_VARIANT,
  ORDER_TYPE_TITLE,
  orderManagerContent as texts,
} from './content';
import { ORDERS_PATH, installerName, type OrderCard } from './model';
import styles from './OrderTable.module.css';

export interface OrderTableProps {
  readonly items: readonly OrderCard[];
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

/**
 * Наряды таблицей (issue #345).
 *
 * 🔴 Серверный компонент целиком: переход между стопками, страницами и сами
 * действия строки — это адреса, а не состояние. Список из восьми строк не
 * стоит ни байта клиентского JS.
 *
 * Колонки — «Когда», «Работа и объект», «Монтажник», «Статус», «Сумма» и
 * действия. Ниже 1200 «Когда» и «Монтажник» уходят в подпись работы: колонка,
 * ужатая до двух слов с переносом, читается хуже строки под названием. Ниже
 * 600 строки становятся карточками — это умеет сам `Table`.
 *
 * 🔴 Три действия строки — ссылки с собственными именами, а не три одинаковых
 * значка: читалка объявляет «Открыть наряд № 128», «Позвонить: Дмитрий
 * Лапшин», «Чеклист выезда наряда № 128».
 */
export function OrderTable({ items, forInstaller = false, now }: OrderTableProps) {
  const moment = now === undefined ? Date.now() : Date.parse(now);

  return (
    /* 🔴 Нижняя ширина таблицы живёт в модуле, а не в пропе `minWidth`: проп
       ставит её стилем на самой таблице, а в карточном режиме (до 600px)
       строки уже разложены по вертикали — и 760px превращались в карточку
       вдвое шире экрана, у которой сумма и статус уезжали за правый край.
       В модуле то же число стоит под порогом 600. */
    <Table className={styles.table} variant="cards" label={texts.tableLabel} fade>
      <thead>
        <tr role="row">
          <th className={styles.whenCol} scope="col">
            {texts.colWhen}
          </th>
          <th scope="col">{texts.colWork}</th>
          <th className={styles.installerCol} scope="col">
            {texts.colInstaller}
          </th>
          <th scope="col">{texts.colStatus}</th>
          {forInstaller ? null : (
            <th className={styles.sumCol} scope="col">
              {texts.colSum}
            </th>
          )}
          {/* Имя колонки действий читалке нужно, а на экране оно только
              повторяет три подписанных значка под собой. */}
          <th scope="col">
            <span className="srOnly">{texts.colActions}</span>
          </th>
        </tr>
      </thead>

      <tbody>
        {items.map((order) => (
          <Row
            key={order.id}
            order={order}
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
  forInstaller,
  overdue,
}: {
  readonly order: OrderCard;
  readonly forInstaller: boolean;
  readonly overdue: boolean;
}) {
  const path = `${ORDERS_PATH}/${order.id}`;
  const overtimeMin = order.overtimeMin ?? 0;

  return (
    /* 🔴 Строка срыва подсвечена тинтом, и на нём тинт складывался бы дважды:
       подложка строки плюс подложка плашки. Класс поднимает приглушённый текст
       на ступень и снимает заливку у плашек — `--badge-fill` объявлен китом
       ровно для этого случая (issue #347). */
    <tr className={overdue ? styles.rowbad : undefined} role="row">
      <td className={styles.when} role="cell" data-label={texts.colWhen}>
        <time dateTime={order.at}>
          {texts.date(order.at)}
          <span className={styles.clock}>{texts.clock(order.at)}</span>
        </time>
      </td>

      <td className={styles.work} role="cell" data-label={texts.colWork}>
        {/* 🔴 Одна обёртка на всё содержимое ячейки. В карточном режиме кита
            ячейка становится флексом с подписью слева, и три блока подряд
            вставали бы тремя колонками шириной в букву. */}
        <span className={styles.workBox}>
          <span className={styles.headline}>
            <Link className={`${styles.number} tapAction`} href={{ pathname: path }}>
              {texts.number(order.number)}
            </Link>
            <Badge size="sm">{ORDER_TYPE_TITLE[order.type]}</Badge>
            {order.heightWorks ? (
              <Badge size="sm" variant="warning">
                {texts.heightWorks}
              </Badge>
            ) : null}
          </span>

          <span className={styles.client}>{order.client.name}</span>
          <span className={styles.address}>{order.address}</span>

          {/* Дата и исполнитель, когда своих колонок у них не остаётся. Узел
              один и тот же на всех ширинах: подпись прячется медиа-запросом, а
              не вторым набором данных, который однажды разойдётся с первым. */}
          <span className={styles.compact}>
            {texts.date(order.at)}, {texts.clock(order.at)} ·{' '}
            {order.installer === null ? texts.installerNone : installerName(order.installer)}
          </span>
        </span>
      </td>

      <td className={styles.installer} role="cell" data-label={texts.colInstaller}>
        {order.installer === null ? (
          <span className={styles.none}>{texts.installerNone}</span>
        ) : (
          installerName(order.installer)
        )}
      </td>

      <td role="cell" data-label={texts.colStatus}>
        {/* 🔴 Плашка лежит в своей обёртке, а не растягивает саму ячейку
            флексом: `display: flex` на `td` выводит ячейку из табличной
            раскладки, и колонка перестаёт держать общую ширину. Отсюда же
            одинаковая координата плашки во всех строках (issue #345). */}
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
          {overtimeMin > 0 ? (
            <span className={styles.overtime}>{texts.overtime(overtimeMin)}</span>
          ) : null}
        </span>
      </td>

      {forInstaller ? null : (
        <td className={styles.sum} role="cell" data-label={texts.colSum}>
          {order.price === undefined ? texts.moneyNone : texts.money(order.price)}
        </td>
      )}

      <td role="cell">
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

          <Link
            className={styles.action}
            href={{ pathname: path, query: { tab: 'checklist' } }}
            aria-label={texts.rowChecklist(order.number)}
          >
            <span aria-hidden="true" title={texts.rowChecklist(order.number)}>
              <Icon name="check" size={18} />
            </span>
          </Link>
        </TableActions>
      </td>
    </tr>
  );
}
