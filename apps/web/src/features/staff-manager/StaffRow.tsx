'use client';

import Link from 'next/link';
import { useState } from 'react';

import {
  Avatar,
  Badge,
  IconButton,
  Switch,
  TableActions,
  Tooltip,
  useConfirm,
  type Confirm,
} from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { EyeIcon, TrashIcon } from './icons';
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
 * Монтажник строкой таблицы команды (issue #602, макет `Team.png`).
 *
 * 🔴 Таблица, а не карточки: раздел открывают, чтобы сравнить людей между
 * собой — кто загружен, кто заработал, у кого удержание. У карточек эти
 * значения стоят в разных местах каждой карточки, и сравнение превращается в
 * поиск глазами.
 *
 * 🔴 Предупреждения — короткий ярлык, а объяснение на нём подсказкой. Абзац в
 * ячейке («Пока оформление не заведено, наряд не уменьшает вознаграждение…»)
 * растил строку до двухсот пикселей, и таблица переставала читаться
 * колонками. Смысл при этом не теряется: ярлык называет состояние сам, а
 * `Tooltip` открывается и наведением, и фокусом (WCAG 1.4.13).
 *
 * 🔴 Доступ переключается прямо в строке: закрыть вход уволившемуся нужно
 * немедленно, и заходить ради этого в карточку — лишний шаг. Переключатель, а
 * не кнопка, — как в макете; подтверждения он не спрашивает намеренно:
 * действие обратимо одним нажатием, а наряды и деньги остаются в истории.
 */
export function StaffRow({ staff, api, stats, confirmRemove, onChanged }: StaffRowProps) {
  const { confirm, dialog } = useConfirm();
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
   * остался бы без исполнителя. То же правило, что в «Опасной зоне» карточки,
   * и причина написана рядом с кнопкой — отключённая кнопка без объяснения
   * хуже отсутствующей.
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

  return (
    <tr role="row" className={staff.active ? undefined : styles.off}>
      <td role="cell" className={styles.who} data-label={texts.colStaff}>
        <div className={styles.person}>
          <Avatar name={who} size="sm" />

          <div className={styles.names}>
            <Link className={`${styles.name} tapAction`} href={`/admin/team/${staff.id}`}>
              {who}
            </Link>
            <span className={styles.since}>{texts.inTeamSince(staff.createdAt)}</span>
          </div>
        </div>

        <div className={styles.badges}>
          {/* Подсказка объясняет последствие: у оформления — что будет с
              удержанием в наряде, у пропущенного ИНН — чем это грозит в день
              выплаты. Ярлык при этом читается и без подсказки.

              🔴 Полный текст лежит рядом скрытым от глаз, а не только в
              подсказке. Плашка не получает фокуса, и подсказка на ней
              достижима одним указателем: без этой строки объяснение исчезло
              бы для озвучки вовсе — а до правки оно было абзацем и читалось
              всеми. */}
          <Tooltip
            text={noEmployment ? texts.employmentUnsetHint : texts.employmentHint(staff.employment)}
          >
            <Badge variant={noEmployment ? 'warning' : 'neutral'} size="sm">
              {noEmployment ? texts.employmentUnsetShort : employmentTitle(staff.employment)}
            </Badge>
          </Tooltip>
          <span className="srOnly">
            {noEmployment ? texts.employmentUnsetHint : texts.employmentHint(staff.employment)}
          </span>

          {innMissing ? (
            <>
              <Tooltip text={texts.innMissing}>
                <Badge variant="danger" size="sm">
                  {texts.innMissingShort}
                </Badge>
              </Tooltip>
              <span className="srOnly">{texts.innMissing}</span>
            </>
          ) : null}
        </div>
      </td>

      <td role="cell" className={styles.phone} data-label={texts.colPhone}>
        {staff.phone === null ? (
          <span className={styles.missing}>{texts.phoneMissing}</span>
        ) : (
          <a className="tapAction" href={`tel:${staff.phone.replace(/\D/g, '')}`}>
            {staff.phone}
          </a>
        )}
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
        <Switch
          label={staff.active ? texts.active : texts.inactive}
          checked={staff.active}
          disabled={busy}
          onChange={() => void toggle()}
        />

        {message === '' ? null : (
          <p className={styles.error} role="alert">
            {message}
          </p>
        )}
      </td>

      <td role="cell" className={styles.actions}>
        <TableActions label={texts.rowActions(who)}>
          {/* Открыть — ссылка, а не кнопка: это переход, и его открывают в
              новой вкладке средней кнопкой мыши так же, как имя строки. */}
          <Link
            className={styles.action}
            href={`/admin/team/${staff.id}`}
            aria-label={texts.rowOpen}
            title={texts.rowOpen}
          >
            <EyeIcon />
          </Link>

          {removeBlocked ? (
            <Tooltip text={texts.rowRemoveBlocked(orders)}>
              <IconButton
                label={texts.remove}
                icon={<TrashIcon />}
                variant="ghost"
                size="sm"
                disabled
              />
            </Tooltip>
          ) : (
            <IconButton
              label={texts.remove}
              icon={<TrashIcon />}
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => void handleRemove()}
            />
          )}
        </TableActions>

        {dialog}
      </td>
    </tr>
  );
}
