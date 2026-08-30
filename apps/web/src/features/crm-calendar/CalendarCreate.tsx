'use client';

import { Button, Icon } from '@/shared/ui';

import { useCalendarActions } from './actions';
import { crmContent as texts } from './content';
import styles from './CalendarCreate.module.css';

export interface CalendarCreateProps {
  /** День, на который заводится запись, когда её заводят из шапки. */
  readonly day: string;
  /**
   * Может ли смотрящий отметить себе занятость. Заводят её себе обе роли
   * (ADR-115) — кнопка прячется только там, где формы нет вовсе.
   */
  readonly canBlock?: boolean | undefined;
}

/**
 * Кнопки заведения в шапке календаря.
 *
 * 🔴 Это второй путь к тому же, что делает клик по сетке (CRM §3.5.1): мышь
 * ставит запись на нужный час протяжкой, а с клавиатуры и с телефона запись
 * заводится отсюда. Ускоритель не имеет права быть единственным входом.
 */
export function CalendarCreate({ day, canBlock = false }: CalendarCreateProps) {
  const actions = useCalendarActions();

  return (
    <div className={styles.buttons}>
      {canBlock ? (
        <Button
          size="sm"
          variant="light"
          onClick={() => actions.block(day)}
          iconStart={<Icon name="clock" size={16} />}
        >
          {texts.busyAdd}
        </Button>
      ) : null}

      <Button size="sm" onClick={() => actions.create(day)} iconStart={<Icon name="plus" />}>
        {texts.add}
      </Button>
    </div>
  );
}
