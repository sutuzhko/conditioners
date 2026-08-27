import Link from 'next/link';

import { formatPhone, phoneHref } from '@/shared/lib/format';
import { Badge, Card } from '@/shared/ui';

import {
  ORDER_STATUS_TITLE,
  ORDER_STATUS_VARIANT,
  ORDER_TYPE_TITLE,
  orderManagerContent as texts,
} from './content';
import { ORDERS_PATH, installerName, type OrderCard } from './model';
import styles from './OrderCardView.module.css';

export interface OrderCardViewProps {
  readonly order: OrderCard;
}

/**
 * Наряд в списке.
 *
 * Серверный компонент: карточка только показывает данные — правка живёт в
 * самом наряде. Держать список интерактивным значило бы платить бюджетом JS
 * панели за экран, по которому листают.
 *
 * Номер, статус, время и монтажник — то, ради чего в список заходят: «кто
 * едет сегодня и во сколько». Остальное открывается в наряде.
 */
export function OrderCardView({ order }: OrderCardViewProps) {
  /* Ключа может не быть вовсе: он приходит из проекции наряда под роль
     (ADR-114). Нет ключа — переработки не показываем, а не показываем ноль. */
  const overtimeMin = order.overtimeMin ?? 0;

  return (
    <Card as="article" className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.number}>
          <Link className={styles.link} href={{ pathname: `${ORDERS_PATH}/${order.id}` }}>
            {texts.number(order.number)}
          </Link>
        </h2>

        <Badge size="sm">{ORDER_TYPE_TITLE[order.type]}</Badge>
        <Badge variant={ORDER_STATUS_VARIANT[order.status]}>
          {ORDER_STATUS_TITLE[order.status]}
        </Badge>
      </div>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>{texts.client}</dt>
          <dd>
            <span className={styles.name}>{order.client.name}</span>{' '}
            {/* Телефон ссылкой: по наряду звонят с того же экрана, а набирать
                номер руками — лишний способ ошибиться цифрой. */}
            <a className={styles.phone} href={phoneHref(order.client.phone)}>
              {formatPhone(order.client.phone)}
            </a>
          </dd>
        </div>

        <div className={styles.fact}>
          <dt>{texts.when}</dt>
          <dd>
            <time dateTime={order.at}>
              {texts.date(order.at)}, {texts.clock(order.at)}
            </time>{' '}
            <span className={styles.span}>{texts.span(order.durationMin)}</span>
            {/* 🔴 Рядом с длительностью, а не отдельной строкой: переработка —
                это часть того же отрезка времени, вышедшая за рабочее окно
                (ADR-138). Обещаний по деньгам здесь нет — только факт. */}
            {overtimeMin > 0 ? (
              <span className={styles.overtime}>{texts.overtime(overtimeMin)}</span>
            ) : null}
          </dd>
        </div>

        <div className={styles.fact}>
          <dt>{texts.address}</dt>
          <dd>{order.address}</dd>
        </div>

        <div className={styles.fact}>
          <dt>{texts.installer}</dt>
          <dd>
            {order.installer === null ? (
              <span className={styles.none}>{texts.installerNone}</span>
            ) : (
              installerName(order.installer)
            )}
          </dd>
        </div>
      </dl>

      {order.units.length === 0 && !order.heightWorks ? null : (
        <div className={styles.marks}>
          {order.units.length === 0 ? null : (
            <Badge variant="neutral" size="sm">
              {texts.unitsCount(order.units.length)}
            </Badge>
          )}
          {/* Высотные работы вынесены в список нарочно: от них зависит, кого
              можно назначить и что взять с собой. */}
          {order.heightWorks ? (
            <Badge variant="warning" size="sm">
              {texts.heightWorks}
            </Badge>
          ) : null}
        </div>
      )}
    </Card>
  );
}
