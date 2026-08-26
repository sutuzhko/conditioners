'use client';

import { useState } from 'react';

import { formatPhone, phoneHref } from '@/shared/lib/format';
import { Badge, Card, Select } from '@/shared/ui';

import {
  EQUIP_TITLE,
  ORDER_STATUS_TITLE,
  ORDER_STATUS_VARIANT,
  ORDER_TYPE_TITLE,
  SOURCE_SHORT,
  orderManagerContent as texts,
} from './content';
import { orderApi } from './lib';
import {
  INSTALLER_STATUSES,
  installerMaySetStatus,
  isOrderStatus,
  type OrderApi,
  type OrderCard,
  type OrderFormStatus,
  type OrderStatus,
  type OrderUnitCard,
} from './model';
import styles from './OrderInstallerView.module.css';

export interface OrderInstallerViewProps {
  readonly order: OrderCard;
  readonly api?: OrderApi | undefined;
  /** Список обновляют снаружи: карточка не знает, откуда её открыли. */
  readonly onChanged?: (() => void) | undefined;
}

const STATUS_OPTIONS = INSTALLER_STATUSES.map((value) => ({
  value,
  label: ORDER_STATUS_TITLE[value],
}));

/** Позиция одной строкой: что везём и на каких условиях. */
function unitLine(unit: OrderUnitCard): string {
  const parts = [
    EQUIP_TITLE[unit.equip],
    SOURCE_SHORT[unit.source],
    unit.trassaM === null ? null : texts.unitTrassaValue(unit.trassaM),
    unit.diameter === null ? null : texts.unitDiameterValue(unit.diameter),
    unit.shtrob ? texts.unitShtrobOn : null,
  ].filter((part): part is string => part !== null);

  return parts.join(' · ');
}

/**
 * Наряд глазами монтажника.
 *
 * 🔴 Заметки владельца и удержания здесь нет вовсе — и это не про скрытые
 * кнопки: сервер не кладёт эти ключи в его ответ (docs/API.md §13), а
 * компонент их не читает. Сумма заказа показывается только при оплате
 * наличными: в остальных случаях её монтажнику знать незачем, и приходить она
 * тоже не должна.
 *
 * Данные — на чтение. Единственное, чем монтажник управляет, — статус, и
 * только двумя значениями: выехал и закончил (CRM.md §6).
 */
export function OrderInstallerView({ order, api = orderApi, onChanged }: OrderInstallerViewProps) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [state, setState] = useState<OrderFormStatus>('idle');
  const [message, setMessage] = useState('');
  const [fieldError, setFieldError] = useState('');

  const sending = state === 'sending';

  const change = async (next: OrderStatus): Promise<void> => {
    const previous = status;
    setStatus(next);
    setState('sending');
    setMessage('');
    setFieldError('');

    const result = await api.setStatus(order.id, next);

    if (result.ok) {
      setState('success');
      onChanged?.();
      return;
    }

    /* Сервер отказал — статус возвращается к прежнему: показывать «Выполнен»
       у наряда, который сервер таким не считает, значит соврать монтажнику. */
    setStatus(previous);
    setState('error');
    if (result.field === 'status') setFieldError(result.message);
    else setMessage(result.message);
  };

  const cash = order.payment === 'cash_to_installer' && order.price !== undefined;

  return (
    <Card as="article" className={styles.card}>
      <header className={styles.head}>
        <h2 className={styles.number}>{texts.number(order.number)}</h2>
        <Badge size="sm">{ORDER_TYPE_TITLE[order.type]}</Badge>
        <Badge variant={ORDER_STATUS_VARIANT[status]}>{ORDER_STATUS_TITLE[status]}</Badge>
      </header>

      <dl className={styles.facts}>
        <div className={styles.fact}>
          <dt>{texts.when}</dt>
          <dd>
            <time dateTime={order.at}>
              {texts.date(order.at)}, {texts.clock(order.at)}
            </time>{' '}
            <span className={styles.quiet}>{texts.span(order.durationMin)}</span>
          </dd>
        </div>

        <div className={styles.fact}>
          <dt>{texts.client}</dt>
          <dd>
            {order.client.name}{' '}
            <a className={styles.phone} href={phoneHref(order.client.phone)}>
              {formatPhone(order.client.phone)}
            </a>
          </dd>
        </div>

        <div className={styles.fact}>
          <dt>{texts.address}</dt>
          <dd>{order.address}</dd>
        </div>

        {order.intercom === null ? null : (
          <div className={styles.fact}>
            <dt>{texts.intercom}</dt>
            <dd>{order.intercom}</dd>
          </div>
        )}

        {order.floor === null ? null : (
          <div className={styles.fact}>
            <dt>{texts.floor}</dt>
            <dd>{order.floor}</dd>
          </div>
        )}

        {order.phone2 === null ? null : (
          <div className={styles.fact}>
            <dt>{texts.phone2}</dt>
            <dd>
              <a className={styles.phone} href={phoneHref(order.phone2)}>
                {formatPhone(order.phone2)}
              </a>
            </dd>
          </div>
        )}
      </dl>

      {order.heightWorks ? <p className={styles.height}>{texts.heightWorksOn}</p> : null}

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>{texts.unitsTitle}</h3>
        {order.units.length === 0 ? (
          <p className={styles.quiet}>{texts.unitsEmpty}</p>
        ) : (
          <ul className={styles.units}>
            {order.units.map((unit) => (
              <li className={styles.unit} key={unit.id}>
                <span className={styles.unitModel}>{unit.model ?? EQUIP_TITLE[unit.equip]}</span>
                <span className={styles.quiet}>{unitLine(unit)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {order.comment === null ? null : <p className={styles.comment}>{order.comment}</p>}

      <section className={styles.block}>
        <h3 className={styles.blockTitle}>{texts.moneyTitle}</h3>
        <dl className={styles.facts}>
          {/* 🔴 Выплата приходит всегда: это его деньги. */}
          <div className={styles.fact}>
            <dt>{texts.installerFee}</dt>
            <dd className={styles.money}>{texts.money(order.installerFee)}</dd>
          </div>

          {/* 🔴 Сумма заказа — только при оплате наличными: её нужно принять
              от клиента на объекте. В остальных случаях ключа нет вовсе. */}
          {cash && order.price !== undefined ? (
            <div className={styles.fact}>
              <dt>{texts.cashToTake}</dt>
              <dd className={styles.money}>{texts.money(order.price)}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      <div className={styles.actions}>
        <Select
          label={texts.statusTitle}
          hint={texts.statusHint}
          options={STATUS_OPTIONS}
          placeholder={texts.statusPlaceholder}
          value={installerMaySetStatus(status) ? status : ''}
          disabled={sending}
          error={fieldError === '' ? undefined : fieldError}
          wrapperClassName={styles.statusField}
          onChange={(event) => {
            const next = event.target.value;
            if (isOrderStatus(next)) void change(next);
          }}
        />

        {state === 'sending' ? (
          <span className={styles.quiet} role="status">
            {texts.statusSaving}
          </span>
        ) : null}

        {state === 'success' ? (
          <span className={styles.ok} role="status">
            {texts.statusSaved}
          </span>
        ) : null}
      </div>

      {state === 'error' && message !== '' ? (
        <p className={styles.error} role="alert">
          {message}
        </p>
      ) : null}
    </Card>
  );
}
