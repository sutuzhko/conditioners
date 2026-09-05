'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { formatPhone, phoneHref } from '@/shared/lib/format';
import { Avatar, RowMenu, useConfirm, type Confirm } from '@/shared/ui';

import { clientManagerContent as texts } from './content';
import { clientApi } from './lib';
import type { ClientApi, ClientCard } from './model';
import styles from './ClientRow.module.css';

export interface ClientRowProps {
  readonly client: ClientCard;
  readonly api?: ClientApi | undefined;
  /** Шов для тестов и историй: окно кита подменяется своим ответом (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
  readonly onChanged?: (() => void) | undefined;
}

/**
 * Клиент строкой таблицы (issue #602, макет `Clients.png`).
 *
 * 🔴 Таблица, а не карточки: раздел открывают, чтобы сравнить людей — кто
 * ездит каждый год, кто отвалился, у кого больше всех работ. У карточек эти
 * значения стоят в разных местах каждой карточки.
 *
 * 🔴 Действия достижимы из списка (ADR-307 §4): открыть, позвонить, удалить.
 * Удаление — исполнение требования 152-ФЗ, и оно спрашивает подтверждение
 * (ADR-113). Меню, а не круглые кнопки со значками: у кита нет «глаза»,
 * «карандаша» и «корзины», а кнопка без подписи не читается (PIXEL_SPEC).
 */
export function ClientRow({ client, api = clientApi, confirmRemove, onChanged }: ClientRowProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const handleRemove = async (): Promise<void> => {
    if (busy) return;
    if (!(await ask(texts.removeConfirm(client.name)))) return;

    setBusy(true);
    setMessage('');

    const result = await api.remove(client.id);
    setBusy(false);

    if (result.ok) {
      onChanged?.();
      router.refresh();
      return;
    }
    setMessage(result.message);
  };

  return (
    <tr role="row">
      <td role="cell" className={styles.who} data-label={texts.colClient}>
        <div className={styles.person}>
          <Avatar name={client.name} size="sm" />

          <div className={styles.names}>
            <Link
              className={`${styles.name} tapAction`}
              href={{ pathname: `/admin/clients/${client.id}` }}
            >
              {client.name}
            </Link>

            {/* Приписка под именем — то, что владелец помнит о человеке:
                заметка и число обращений. Обрезается стилем, а не текстом:
                многоточие ставит CSS, а не подсчёт символов в коде. */}
            <span className={styles.note}>{client.note ?? texts.leadCount(client.leadCount)}</span>
          </div>
        </div>
      </td>

      <td role="cell" className={styles.phone} data-label={texts.colPhone}>
        <a className="tapAction" href={phoneHref(client.phone)}>
          {formatPhone(client.phone)}
        </a>
      </td>

      <td role="cell" className={styles.address} data-label={texts.colAddress}>
        {client.address ?? <span className={styles.missing}>{texts.addressMissing}</span>}
      </td>

      <td role="cell" className={styles.number} data-label={texts.colOrders}>
        {client.orderCount}
      </td>

      <td role="cell" className={styles.number} data-label={texts.colSum}>
        {client.orderCount === 0 ? (
          <span className={styles.missing}>{texts.noOrders}</span>
        ) : (
          texts.money(client.orderSum)
        )}
      </td>

      <td role="cell" className={styles.when} data-label={texts.colLast}>
        {client.lastOrderAt === null ? (
          <span className={styles.missing}>{texts.dash}</span>
        ) : (
          <time dateTime={client.lastOrderAt}>{texts.date(client.lastOrderAt)}</time>
        )}
      </td>

      <td role="cell" className={styles.actions}>
        <RowMenu
          label={texts.rowActions(client.name)}
          items={[
            {
              id: 'call',
              label: texts.rowCall,
              onSelect: () => {
                window.location.href = phoneHref(client.phone);
              },
            },
            {
              id: 'remove',
              label: texts.remove,
              danger: true,
              disabled: busy,
              onSelect: () => void handleRemove(),
            },
          ]}
        />

        {message === '' ? null : (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}

        {dialog}
      </td>
    </tr>
  );
}
