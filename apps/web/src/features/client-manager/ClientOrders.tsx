import Link from 'next/link';

import { ORDER_STATUS_VARIANT } from '@/entities/order/model';
import { Badge, Card } from '@/shared/ui';

import { clientManagerContent as texts } from './content';
import type { ClientOrder, ClientOrders as ClientOrdersData } from './model';
import styles from './ClientOrders.module.css';

export interface ClientOrdersProps {
  readonly orders: ClientOrdersData;
  /** Куда уводит «Все наряды клиента»: адрес знает страница, а не список. */
  readonly allHref: { readonly pathname: string; readonly query: Record<string, string> };
}

/**
 * История заказов человека (CRM.md §3.2).
 *
 * 🔴 Серверный компонент: наряды здесь только показывают. Правят их в
 * карточке наряда, и второй набор полей рядом означал бы два места, где одна
 * и та же сумма меняется по-разному.
 *
 * 🔴 Показываются последние, а не все: история клиента, с которым работают
 * пятый год, растёт без потолка, и карточку открывают ради последнего выезда.
 * Сколько осталось за кадром, строка говорит прямо — и уводит туда, где видно
 * всё.
 */
export function ClientOrders({ orders, allHref }: ClientOrdersProps) {
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
 * 🔴 Сумма стоит на своей линии справа и не зависит от длины адреса: колонка
 * фиксированной ширины, а не хвост строки. Иначе главная цифра списка пляшет
 * по вертикали от наряда к наряду.
 */
function OrderRow({ order }: { readonly order: ClientOrder }) {
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
        <span className={styles.kind}>{texts.orderType(order.type)}</span>
        <span className={styles.address}>{order.address}</span>
        <span className={styles.who}>{texts.orderInstaller(order.installerName)}</span>
      </span>

      <span className={styles.price}>{texts.orderPrice(order.price)}</span>
    </Link>
  );
}
