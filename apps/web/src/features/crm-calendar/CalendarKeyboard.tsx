'use client';

import { useCallback, useState } from 'react';

import { Button } from '@/shared/ui';

import { CalendarHelp } from './CalendarHelp';
import { CalendarKeys } from './CalendarKeys';
import { calendarKeysContent as texts } from './content';
import type { CalendarPlace } from './navigation';
import styles from './CalendarKeyboard.module.css';

export type CalendarKeyboardProps = CalendarPlace;

/**
 * Клавиатура календаря целиком: слушатель, подсказка и кнопка, которая её
 * открывает.
 *
 * Собрано в один компонент, потому что состояние у них общее — открыта
 * подсказка или нет, — и разносить его по трём местам значило бы поднимать
 * состояние в серверную шапку, которой оно не принадлежит.
 */
export function CalendarKeyboard(place: CalendarKeyboardProps) {
  const [open, setOpen] = useState(false);
  const show = useCallback(() => setOpen(true), []);
  const hide = useCallback(() => setOpen(false), []);

  return (
    <>
      <CalendarKeys {...place} onHelp={show} />

      <Button
        type="button"
        variant="light"
        size="sm"
        className={styles.button}
        aria-label={texts.openLabel}
        onClick={show}
      >
        {texts.open}
      </Button>

      <CalendarHelp open={open} onClose={hide} />
    </>
  );
}
