'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button, Card, useConfirm, type Confirm } from '@/shared/ui';

import { staffManagerContent as texts } from './content';
import { staffApi } from './lib';
import { staffTitle, type StaffApi, type StaffDetails } from './model';
import styles from './StaffDangerZone.module.css';

export interface StaffDangerZoneProps {
  readonly staff: StaffDetails;
  /**
   * Сколько нарядов закреплено за человеком. Пока их больше нуля, учётную
   * запись не удаляют: наряд остался бы без исполнителя.
   */
  readonly orders: number;
  readonly api?: StaffApi | undefined;
  /** Шов для тестов: по умолчанию — общий диалог подтверждения (ADR-113). */
  readonly confirmRemove?: Confirm | undefined;
}

/**
 * Опасная зона карточки монтажника (issue #351).
 *
 * 🔴 Отделена рамкой и стоит последней на всех ширинах. До неё доскроллят
 * осознанно: закрытие доступа и удаление учётной записи — не соседи полю
 * «телефон», и стоять с ним в одном ряду кнопок они не должны.
 *
 * 🔴 Кнопка «Удалить» отключена, пока за человеком закреплены наряды, и
 * причина написана рядом. Отключённая кнопка без объяснения хуже
 * отсутствующей: человек нажимает, ничего не происходит, и он не знает,
 * сломался интерфейс или так задумано.
 */
export function StaffDangerZone({
  staff,
  orders,
  api = staffApi,
  confirmRemove,
}: StaffDangerZoneProps) {
  const { confirm, dialog } = useConfirm();
  const ask = confirmRemove ?? confirm;

  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const blocked = orders > 0;

  const toggle = async (): Promise<void> => {
    setBusy(true);
    setMessage('');

    const result = await api.update(staff.id, { active: !staff.active });

    setBusy(false);
    if (result.ok) {
      router.refresh();
      return;
    }
    setMessage(result.message);
  };

  const remove = async (): Promise<void> => {
    if (!(await ask(texts.removeConfirm(staffTitle(staff))))) return;

    setBusy(true);
    setMessage('');

    const result = await api.remove(staff.id);

    if (result.ok) {
      router.push('/admin/team');
      return;
    }
    setBusy(false);
    setMessage(result.message);
  };

  return (
    <Card as="section" className={styles.zone}>
      <header className={styles.header}>
        <h2 className={styles.title}>{texts.dangerTitle}</h2>
        <p className={styles.hint}>{texts.dangerHint}</p>
      </header>

      <div className={styles.row}>
        <Button
          type="button"
          variant="bordered"
          size="sm"
          disabled={busy}
          onClick={() => void toggle()}
        >
          {staff.active ? texts.disable : texts.enable}
        </Button>
        <p className={styles.note}>{texts.disableHint}</p>
      </div>

      <div className={styles.row}>
        <Button
          type="button"
          variant="bordered"
          size="sm"
          className={styles.remove}
          disabled={busy || blocked}
          onClick={() => void remove()}
        >
          {texts.remove}
        </Button>

        {/* Причина стоит рядом с кнопкой, а не в подсказке при наведении: с
            телефона наведения не бывает вовсе. */}
        <p className={blocked ? styles.blocked : styles.note}>
          {blocked ? texts.removeBlocked(orders) : texts.removeHint}
        </p>
      </div>

      {message === '' ? null : (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      {dialog}
    </Card>
  );
}
