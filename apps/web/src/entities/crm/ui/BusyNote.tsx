import { Icon } from '@/shared/ui';

import { busyTitle, crmBusyContent as texts } from '../content';
import type { DayBusy } from '../lib/busy';
import styles from './BusyNote.module.css';

export interface BusyNoteProps {
  readonly busy: DayBusy;
  /** Чья занятость: владелец видит и чужую, и без имени она ему ничего не скажет. */
  readonly who?: string | undefined;
  readonly className?: string | undefined;
}

/**
 * Предупреждение о занятости в форме дела или наряда.
 *
 * 🔴 Предупреждает, а не запрещает. Срочный ремонт в июльскую жару важнее
 * любого запрета: владелец должен увидеть «день закрыт: семейные дела» и
 * решить сам. Поэтому здесь нет ни блокировки кнопки, ни подтверждения — одна
 * заметная строка рядом с полем даты.
 *
 * Живёт у сущности, а не в фиче календаря: то же предупреждение нужно форме
 * наряда, а импорт вбок между фичами правило слоёв запрещает.
 */
export function BusyNote({ busy, who, className }: BusyNoteProps) {
  if (busy.state === 'free') return null;

  return (
    /* role=status, а не alert: это не ошибка, и перебивать человека посреди
       заполнения формы ей незачем — она сообщается следующей паузой */
    <p className={[styles.note, className].filter(Boolean).join(' ')} role="status">
      {/* значок, а не только цвет: занятость обязана читаться и в ч/б, и дальтоником */}
      <Icon className={styles.icon} name={busy.state === 'full' ? 'danger' : 'clock'} size={18} />

      <span className={styles.body}>
        <span className={styles.title}>
          {who === undefined
            ? busyTitle(busy)
            : `${who} — ${busyTitle(busy).toLocaleLowerCase('ru-RU')}`}
        </span>
        <span className={styles.hint}>{texts.noteHint}</span>
      </span>
    </p>
  );
}
