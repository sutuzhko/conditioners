'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { rowActionTexts as rowTexts } from '@/shared/config/row-actions';
import { formatPhone, phoneHref, phonePlain } from '@/shared/lib/format';
import {
  Avatar,
  Icon,
  RowMenu,
  TableRow,
  TableRowLink,
  tableAboveClassName,
  useConfirm,
  useCopy,
  type Confirm,
  type RowMenuItem,
} from '@/shared/ui';

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
 * 🔴 Строка нажимается целиком (issue #743): карточка клиента открывается
 * нажатием в любую её точку, а не одним именем. Приём китовый (`TableRow`,
 * `TableRowLink`, ADR-347) — площадь строке отдаёт перекрытие ссылки имени, и
 * целей у строки от этого не прибавляется. Над перекрытием подняты только
 * те, что обязаны действовать сами: телефон и меню строки.
 *
 * 🔴 Действия достижимы из списка (ADR-307 §4): открыть, позвонить,
 * скопировать, удалить. Удаление — исполнение требования 152-ФЗ, и оно
 * спрашивает подтверждение (ADR-113). Меню, а не круглые кнопки со значками:
 * у кита нет «глаза», «карандаша» и «корзины», а кнопка без подписи не
 * читается (PIXEL_SPEC).
 *
 * 🔴 Меню знало два действия из четырёх (issue #744): открыть карточку из
 * него было нельзя, скопировать номер — тоже, а «Позвонить» было присвоением
 * `location.href`. На рабочем столе, где обработчика `tel:` нет, присвоение
 * выглядит как «ничего не произошло», — а список клиентов открывают именно
 * чтобы позвонить. Теперь это настоящие ссылки: их видит браузер, их
 * открывают средней кнопкой.
 *
 * 🔴 Копирование — вторым уровнем меню, с выбором поля (ADR-351). Поднимать
 * ради него ячейку над перекрытием строки больше не нужно: выделение мышью
 * было точным приёмом, который на телефоне не работает вовсе.
 */
export function ClientRow({ client, api = clientApi, confirmRemove, onChanged }: ClientRowProps) {
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  const { copy, status } = useCopy();
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

  /* Проверка внутри самого действия, а не только вокруг пункта: обработчик
     переживает перерисовку строки, и «адрес точно есть» здесь — то, что
     обязано быть написано, а не подразумеваться сужением типа снаружи. */
  const copyAddress = (): void => {
    if (client.address === null) return;
    copy(client.address, rowTexts.fieldAddress);
  };

  /* Что можно скопировать из этой строки. Адрес — только когда он есть:
     пункт, кладущий в буфер пустоту, хуже отсутствующего. */
  const copyItems: readonly RowMenuItem[] = [
    {
      id: 'copy-phone',
      label: rowTexts.fieldPhone,
      onSelect: () => copy(phonePlain(client.phone), rowTexts.fieldPhone),
    },
    ...(client.address === null
      ? []
      : [{ id: 'copy-address', label: rowTexts.fieldAddress, onSelect: copyAddress }]),
    {
      id: 'copy-name',
      label: rowTexts.fieldName,
      onSelect: () => copy(client.name, rowTexts.fieldName),
    },
  ];

  const items: readonly RowMenuItem[] = [
    {
      id: 'open',
      label: rowTexts.open,
      icon: <Icon name="eye" size={16} />,
      href: { pathname: `/admin/clients/${client.id}` },
    },
    {
      id: 'call',
      label: rowTexts.call,
      icon: <Icon name="phone" size={16} />,
      anchor: phoneHref(client.phone),
    },
    {
      id: 'copy',
      label: rowTexts.copy,
      icon: <Icon name="bill" size={16} />,
      items: copyItems,
    },
    {
      id: 'remove',
      label: texts.remove,
      icon: <Icon name="trash" size={16} />,
      danger: true,
      disabled: busy,
      onSelect: () => void handleRemove(),
    },
  ];

  return (
    <TableRow>
      <td role="cell" className={styles.who} data-label={texts.colClient}>
        <div className={styles.person}>
          <Avatar name={client.name} size="sm" />

          <div className={styles.names}>
            <TableRowLink
              className={`${styles.name} tapAction`}
              href={{ pathname: `/admin/clients/${client.id}` }}
              label={texts.rowLabel(client.name)}
            >
              {client.name}
            </TableRowLink>

            {/* Приписка под именем — то, что владелец помнит о человеке:
                заметка и число обращений. Обрезается стилем, а не текстом:
                многоточие ставит CSS, а не подсчёт символов в коде. */}
            <span className={styles.note}>{client.note ?? texts.leadCount(client.leadCount)}</span>
          </div>
        </div>
      </td>

      <td role="cell" className={styles.phone} data-label={texts.colPhone}>
        {/* 🔴 Телефон поднят над перекрытием строки: «позвонить» обязано
            звонить, а не открывать карточку. Иначе цель считалась бы накрытой
            и на телефоне была бы недостижима вовсе. */}
        <a className={tableAboveClassName('tapAction')} href={phoneHref(client.phone)}>
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
        {/* 🔴 Поднято само меню, а не его ячейка: ниже 600px ячейка идёт
            полосой во всю ширину карточки и отняла бы у строки заметный кусок
            площади (ADR-347). */}
        <RowMenu
          className={tableAboveClassName()}
          label={texts.rowActions(client.name)}
          items={items}
        />

        {/* Подтверждение копирования и запасной путь, когда буфер недоступен
            (issue #744): область живёт всегда, иначе читалка её не объявит. */}
        {status}

        {message === '' ? null : (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}

        {dialog}
      </td>
    </TableRow>
  );
}
