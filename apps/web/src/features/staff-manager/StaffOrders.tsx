import Link from 'next/link';

import { ORDER_STATUS_VARIANT } from '@/entities/order/model';
import { Badge, Card } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import type { StaffOrder, StaffOrders as StaffOrdersData } from './model';
import styles from './StaffOrders.module.css';

export interface StaffOrdersProps {
  readonly orders: StaffOrdersData;
  /** Куда уводит «Все наряды монтажника»: адрес знает страница. */
  readonly allHref: { readonly pathname: string; readonly query: Record<string, string> };
}

/**
 * Наряды монтажника — вкладка «Заказы» его карточки (CRM.md §3.6).
 *
 * 🔴 Серверный компонент: наряды здесь показывают, а правят в карточке
 * наряда. Второй набор полей рядом означал бы два места, где одна и та же
 * сумма меняется по-разному.
 *
 * Показываются последние: у человека, работающего третий год, история растёт
 * без потолка, а карточку открывают ради недавнего.
 */
export function StaffOrders({ orders, allHref }: StaffOrdersProps) {
  return (
    <Card as="section" className={styles.card}>
      <header className={styles.header}>
        <h2 className={styles.title}>{texts.ordersTitle}</h2>
        <p className={styles.hint}>{texts.ordersHint}</p>
      </header>

      {orders.items.length === 0 ? (
        <p className={styles.empty}>{texts.ordersEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {orders.items.map((order) => (
            <li key={order.id}>
              <OrderRow order={order} />
            </li>
          ))}
        </ul>
      )}

      {orders.total > orders.items.length ? (
        <p className={styles.more}>{texts.ordersShown(orders.items.length, orders.total)}</p>
      ) : null}

      {orders.items.length === 0 ? null : (
        <p className={styles.actions}>
          <Link className={styles.all} href={allHref}>
            {texts.ordersAll}
          </Link>
        </p>
      )}
    </Card>
  );
}

/**
 * Одна работа строкой.
 *
 * 🔴 Выплата стоит своей колонкой, а не хвостом строки: у наряда с длинным
 * адресом и у наряда с коротким она обязана стоять на одной высоте, иначе
 * главная цифра списка пляшет от строки к строке (ADR-241).
 */
function OrderRow({ order }: { readonly order: StaffOrder }) {
  return (
    <Link className={styles.row} href={{ pathname: `/admin/orders/${order.id}` }}>
      <span className={styles.head}>
        <span className={styles.number}>{texts.orderNumber(order.number)}</span>
        <Badge variant={ORDER_STATUS_VARIANT[order.status]} size="sm">
          {texts.orderStatus(order.status)}
        </Badge>
      </span>

      <span className={styles.facts}>
        <time className={styles.when} dateTime={order.at}>
          {texts.date(order.at)}
        </time>
        <span>{texts.orderType(order.type)}</span>
        <span className={styles.who}>{order.clientName}</span>
        <span className={styles.address}>{order.address}</span>
      </span>

      <span className={styles.fee}>{texts.money(order.fee)}</span>
    </Link>
  );
}
