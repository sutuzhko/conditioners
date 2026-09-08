'use client';

import { useState } from 'react';

import { rowActionTexts as rowTexts } from '@/shared/config/row-actions';
import { phoneHref, phonePlain } from '@/shared/lib/format';
import {
  Avatar,
  Badge,
  Icon,
  RowMenu,
  Switch,
  TableRow,
  TableRowLink,
  Tooltip,
  tableAboveClassName,
  useConfirm,
  useCopy,
  type Confirm,
  type RowMenuItem,
} from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { StaffLoadBar } from './StaffLoadBar';
import type { StaffApi, StaffDetails, StaffRowStats } from './model';
import { employmentTitle, isSelfEmployedWithoutInn, staffTitle } from './model';
import styles from './StaffRow.module.css';

export interface StaffRowProps {
  readonly staff: StaffDetails;
  readonly api: StaffApi;
  /** Загрузка недели и деньги месяца. `undefined` — показателей ещё нет. */
  readonly stats?: StaffRowStats | undefined;
  /** Шов для тестов и историй: окно кита подменяется своим ответом (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
  readonly onChanged?: (() => void) | undefined;
}

/**
 * Монтажник строкой таблицы команды (issue #602, макет `Team.body.html`).
 *
 * 🔴 Таблица, а не карточки: раздел открывают, чтобы сравнить людей между
 * собой — кто загружен, кто заработал, у кого удержание. У карточек эти
 * значения стоят в разных местах каждой карточки, и сравнение превращается в
 * поиск глазами.
 *
 * 🔴 Ярлыки оформления стоят своей колонкой, а не третьим ярусом под именем
 * (issue #745, #746). Ярусом они растили строку до 99,8px при высоте
 * содержимого в 17–42px: семь ячеек прижимались к верху, ярлыки висели на
 * 46,6px ниже всех, и сравнение по рядам — то, ради чего таблица заведена, —
 * переставало работать. Колонку освободил телефон: он «жрёт кучу места»
 * (слова владельца) ради текста, который из строки не читают, а копируют
 * кнопкой. Ниже 600px, где строка разворачивается карточкой, номер
 * возвращается: там его читают, а не сравнивают.
 *
 * 🔴 Подпись ярлыка короткая, а объяснение — подсказкой на нём. Абзац в
 * ячейке («Пока оформление не заведено, наряд не уменьшает вознаграждение…»)
 * растил строку до двухсот пикселей. Смысл не теряется: ярлык называет
 * состояние сам, колонка называет, о чём он, а `Tooltip` открывается и
 * наведением, и фокусом (WCAG 1.4.13).
 *
 * 🔴 Строка нажимается целиком (issue #743): карточка монтажника открывается
 * нажатием в любую её точку. Приём китовый (`TableRow`, `TableRowLink`,
 * ADR-347). Над перекрытием подняты те, что обязаны работать сами: ярлыки с
 * подсказками, переключатель доступа и меню действий.
 *
 * 🔴 Действия — меню строки, ровно то же и в том же порядке, что у клиентов
 * (issue #744, #745): открыть · позвонить · скопировать · удалить. Два списка
 * людей в одной панели не должны требовать двух разных привычек. Круг
 * «Открыть карточку» из ряда убран (issue #866): он вёл по тому же адресу,
 * что и вся строка, — «глаз делает то же самое, что и клик», слова
 * владельца.
 *
 * 🔴 Доступ переключается прямо в строке: закрыть вход уволившемуся нужно
 * немедленно, и заходить ради этого в карточку — лишний шаг. Переключатель, а
 * не кнопка, — как в макете; подтверждения он не спрашивает намеренно:
 * действие обратимо одним нажатием, а наряды и деньги остаются в истории.
 */
export function StaffRow({ staff, api, stats, confirmRemove, onChanged }: StaffRowProps) {
  const { confirm, dialog } = useConfirm();
  const { copy, status } = useCopy();
  const ask = confirmRemove ?? confirm;

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const toggle = async (): Promise<void> => {
    setBusy(true);
    setMessage('');

    const result = await api.update(staff.id, { active: !staff.active });

    setBusy(false);
    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message);
  };

  const who = staffTitle(staff);

  /**
   * 🔴 Удаление закрыто, пока за человеком закреплены наряды: иначе наряд
   * остался бы без исполнителя. То же правило, что в «Опасной зоне» карточки.
   */
  const orders = stats?.orders ?? 0;
  const removeBlocked = orders > 0;

  const handleRemove = async (): Promise<void> => {
    if (busy || removeBlocked) return;
    if (!(await ask(texts.removeConfirm(who)))) return;

    setBusy(true);
    setMessage('');

    const result = await api.remove(staff.id);
    setBusy(false);

    if (result.ok) {
      onChanged?.();
      return;
    }
    setMessage(result.message);
  };

  /* Пустое оформление и самозанятый без ИНН — не мелочи оформления карточки:
     от первого зависит, уменьшает ли наряд вознаграждение, второе оплачивает
     компания в день выплаты. Владелец обязан прочитать это из списка — но
     ярлыком, а не абзацем. */
  const noEmployment = staff.employment === null;
  const innMissing = isSelfEmployedWithoutInn(staff.employment, staff.inn);

  const phone = staff.phone;

  /* Проверка внутри самого действия, а не только вокруг пункта: обработчик
     переживает перерисовку строки, и «телефон точно есть» здесь — то, что
     обязано быть написано, а не подразумеваться сужением типа снаружи. */
  const copyPhone = (): void => {
    if (staff.phone === null) return;
    copy(phonePlain(staff.phone), rowTexts.fieldPhone);
  };

  /* Что копируют из строки (ADR-351). Телефона может не быть вовсе — пункт,
     кладущий в буфер пустоту, хуже отсутствующего. */
  const copyItems: readonly RowMenuItem[] = [
    ...(phone === null
      ? []
      : [{ id: 'copy-phone', label: rowTexts.fieldPhone, onSelect: copyPhone }]),
    {
      id: 'copy-name',
      label: rowTexts.fieldName,
      onSelect: () => copy(who, rowTexts.fieldName),
    },
  ];

  /* 🔴 Отключённый пункт называет причину прямо в подписи, а не подсказкой на
     себе: подсказка на отключённом элементе не открывается ни фокусом, ни
     половиной указателей, и «Удалить» серым без объяснения читается как
     поломка. */
  const items: readonly RowMenuItem[] = [
    {
      id: 'open',
      label: rowTexts.open,
      icon: <Icon name="eye" size={16} />,
      href: { pathname: `/admin/team/${staff.id}` },
    },
    phone === null
      ? {
          id: 'call',
          label: texts.rowCallBlocked,
          icon: <Icon name="phone" size={16} />,
          disabled: true,
          onSelect: () => undefined,
        }
      : {
          id: 'call',
          label: rowTexts.call,
          icon: <Icon name="phone" size={16} />,
          anchor: phoneHref(phone),
        },
    {
      id: 'copy',
      label: rowTexts.copy,
      icon: <Icon name="bill" size={16} />,
      items: copyItems,
    },
    {
      id: 'remove',
      label: removeBlocked ? texts.rowRemoveBlocked(orders) : texts.remove,
      icon: <Icon name="trash" size={16} />,
      danger: true,
      disabled: busy || removeBlocked,
      onSelect: () => void handleRemove(),
    },
  ];

  return (
    <TableRow className={staff.active ? undefined : styles.off}>
      <td role="cell" className={styles.who} data-label={texts.colStaff}>
        <div className={styles.person}>
          <Avatar name={who} size="sm" />

          <div className={styles.names}>
            <TableRowLink
              className={`${styles.name} tapAction`}
              href={{ pathname: `/admin/team/${staff.id}` }}
              label={texts.rowLabel(who)}
            >
              {who}
            </TableRowLink>
            <span className={styles.since}>{texts.inTeamSince(staff.createdAt)}</span>
          </div>
        </div>
      </td>

      {/* 🔴 Колонка живёт только на карточке телефона (issue #745): выше 600px
          номер копируют из меню строки, а место отдано показателям — тому,
          ради чего таблица заводилась. Ячейка не удалена, а скрыта: на 390
          строка разворачивается карточкой, и там номер нужен глазами. */}
      <td role="cell" className={styles.phone} data-label={texts.colPhone}>
        {phone === null ? (
          <span className={styles.missing}>{texts.phoneMissing}</span>
        ) : (
          /* 🔴 Телефон поднят над перекрытием: «позвонить» обязано звонить,
             а не открывать карточку. */
          <a className={tableAboveClassName('tapAction')} href={phoneHref(phone)}>
            {phone}
          </a>
        )}
      </td>

      <td role="cell" className={styles.employment} data-label={texts.employment}>
        {/* 🔴 Ярлыки подняты над перекрытием строки не потому, что они цели —
            фокуса у них нет, — а потому, что их подсказка открывается
            наведением (WCAG 1.4.13). Под перекрытием курсор физически стоит
            на ссылке, `mouseenter` до ярлыка не доходит, и объяснение
            «Не заведено» исчезло бы для указателя. */}
        <div className={tableAboveClassName(styles.badges)}>
          {/* Подсказка объясняет последствие: у оформления — что будет с
              удержанием в наряде, у пропущенного ИНН — чем это грозит в день
              выплаты. Ярлык при этом читается и без подсказки: колонка
              называет, о чём он.

              🔴 Полный текст лежит рядом скрытым от глаз, а не только в
              подсказке. Плашка не получает фокуса, и подсказка на ней
              достижима одним указателем: без этой строки объяснение исчезло
              бы для озвучки вовсе. */}
          <Tooltip
            text={noEmployment ? texts.employmentUnsetHint : texts.employmentHint(staff.employment)}
          >
            <Badge variant={noEmployment ? 'warning' : 'neutral'} size="sm" wrap>
              {noEmployment ? texts.employmentUnsetShort : employmentTitle(staff.employment)}
            </Badge>
          </Tooltip>
          <span className="srOnly">
            {noEmployment ? texts.employmentUnsetHint : texts.employmentHint(staff.employment)}
          </span>

          {innMissing ? (
            <>
              <Tooltip text={texts.innMissing}>
                <Badge variant="danger" size="sm" wrap>
                  {texts.innMissingShort}
                </Badge>
              </Tooltip>
              <span className="srOnly">{texts.innMissing}</span>
            </>
          ) : null}
        </div>
      </td>

      <td role="cell" data-label={texts.colLoad}>
        {stats === undefined ? (
          <span className={styles.missing}>{texts.dash}</span>
        ) : (
          <StaffLoadBar
            minutes={stats.loadMin}
            normMin={stats.normMin}
            overtimeMin={stats.overtimeMin}
          />
        )}
      </td>

      <td role="cell" className={styles.number} data-label={texts.colDone}>
        {stats?.done ?? 0}
      </td>

      <td role="cell" className={styles.number} data-label={texts.colEarned}>
        {texts.money(stats?.earned ?? 0)}
      </td>

      <td role="cell" className={styles.number} data-label={texts.colDeductions}>
        {stats === undefined || stats.deductionSum === 0 ? (
          <span className={styles.missing}>{texts.noDeductions}</span>
        ) : (
          <Badge variant="danger" size="sm">
            {texts.money(stats.deductionSum)}
          </Badge>
        )}
      </td>

      <td role="cell" data-label={texts.colAccess}>
        {/* 🔴 Подпись состояния снята с экрана и живёт подсказкой (issue #663).
            Слово «Активен» повторяло в каждой строке то, что дорожка уже
            показывает положением бегунка, и занимало место в колонке. Именем
            ввода оно остаётся: `labelHidden` прячет подпись, но оставляет её
            в разметке и в связи через `htmlFor`. */}
        {/* Поднят весь пузырёк подсказки, а не один переключатель: наведение
            ловит обёртка `Tooltip`, и под перекрытием оно до неё не дойдёт. */}
        <Tooltip
          className={tableAboveClassName()}
          text={staff.active ? texts.active : texts.inactive}
        >
          <Switch
            label={staff.active ? texts.active : texts.inactive}
            labelHidden
            checked={staff.active}
            disabled={busy}
            onChange={() => void toggle()}
          />
        </Tooltip>

        {message === '' ? null : (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}
      </td>

      <td role="cell" className={styles.actions}>
        <RowMenu className={tableAboveClassName()} label={texts.rowActions(who)} items={items} />

        {/* Подтверждение копирования и запасной путь, когда буфер недоступен
            (issue #744): область живёт всегда, иначе читалка её не объявит. */}
        {status}

        {dialog}
      </td>
    </TableRow>
  );
}
