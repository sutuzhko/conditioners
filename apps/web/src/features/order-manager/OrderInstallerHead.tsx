import type { OrderCard } from '@/entities/order/model';
import { Badge } from '@/shared/ui';

import { ORDER_STATUS_TITLE, ORDER_STATUS_VARIANT, orderManagerContent as texts } from './content';
import { installerContent as own, installerWorkTitle } from './installer-content';
import styles from './OrderInstallerHead.module.css';

export interface OrderInstallerHeadProps {
  readonly order: OrderCard;
}

/**
 * Шапка наряда у монтажника: что за работа, когда и в каком она состоянии.
 *
 * 🔴 Заголовок — работа, номер — моноширинная метка рядом со временем. Тот же
 * приём, что в наряде дня и на сдаче: в макете номер был то заголовком экрана,
 * то мелкой подписью в углу, и по списку было не понять, чем наряд назван
 * (issue #633).
 *
 * 🔴 Свою переработку монтажник видит: это его часы, и ключ приходит ему в
 * проекции наравне с выплатой. Пересчитывать её здесь нечего — сервер записал
 * её в момент выезда, и переписывать прошлый четверг правкой рабочего окна
 * никто не станет (ADR-138).
 */
export function OrderInstallerHead({ order }: OrderInstallerHeadProps) {
  const overtimeMin = order.overtimeMin;

  return (
    <header className={styles.head}>
      <h1 className={styles.title}>{installerWorkTitle(order)}</h1>

      <p className={styles.meta}>
        <time className={styles.clock} dateTime={order.at}>
          {texts.date(order.at)}, {texts.clock(order.at)}
        </time>
        <span className={styles.span}>{texts.span(order.durationMin)}</span>
        <span className={styles.number}>{texts.number(order.number)}</span>
        <Badge variant={ORDER_STATUS_VARIANT[order.status]} dot>
          {ORDER_STATUS_TITLE[order.status]}
        </Badge>
      </p>

      {overtimeMin > 0 ? <p className={styles.overtime}>{texts.overtime(overtimeMin)}</p> : null}

      {order.status === 'cancelled' ? (
        <p className={styles.cancelled}>{own.cancelledNote}</p>
      ) : null}
    </header>
  );
}
