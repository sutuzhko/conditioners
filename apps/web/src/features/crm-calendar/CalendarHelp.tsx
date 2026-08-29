'use client';

import { Button, Modal } from '@/shared/ui';

import { CALENDAR_KEYS, calendarKeysContent as texts } from './content';
import styles from './CalendarHelp.module.css';

export interface CalendarHelpProps {
  readonly open: boolean;
  readonly onClose: () => void;
}

/**
 * Что умеет клавиатура календаря.
 *
 * 🔴 Список нужен потому, что горячие клавиши невидимы: без него они есть
 * только у того, кто читал документацию, — то есть ни у кого (issue #124).
 * Открывается кнопкой в шапке и клавишей «?».
 */
export function CalendarHelp({ open, onClose }: CalendarHelpProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={texts.title}
      description={texts.description}
      size="sm"
      footer={<Button onClick={onClose}>{texts.close}</Button>}
    >
      <dl className={styles.list}>
        {CALENDAR_KEYS.map((row) => (
          <div className={styles.row} key={row.keys}>
            <dt className={styles.keys}>{row.keys}</dt>
            <dd className={styles.what}>{row.what}</dd>
          </div>
        ))}
      </dl>
    </Modal>
  );
}
