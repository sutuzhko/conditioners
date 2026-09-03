import type { ReactNode } from 'react';

import { Icon } from '../Icon';
import styles from './ErrorState.module.css';

export interface ErrorStateProps {
  /** Что именно не загрузилось: «Не удалось загрузить заявки». */
  readonly title: string;
  /**
   * Что с данными. 🔴 Обязателен: владелец смотрит на экран ровно затем,
   * чтобы понять, не потерялись ли заявки, — код ответа ему не нужен.
   */
  readonly children: ReactNode;
  /** Действия: «Повторить» и «Обновить страницу». */
  readonly actions?: ReactNode | undefined;
  readonly className?: string | undefined;
}

/**
 * Ошибка блока панели (issue #336).
 *
 * Та же анатомия, что у пустого состояния: значок в круге, заголовок,
 * объяснение, действия. Различие в тоне — круг красный — и в том, что
 * действий два: повторить запрос и перезагрузить страницу целиком.
 *
 * 🔴 Блок объявлен `role="alert"`: он появляется на месте данных без
 * действия человека, и без объявления читалка промолчит — человек будет
 * ждать список, которого не будет. Заголовок остаётся заголовком: обход по
 * заголовкам обязан на ошибке останавливаться, как и на пустом состоянии.
 */
export function ErrorState({ title, children, actions, className }: ErrorStateProps) {
  return (
    <div className={[styles.box, className].filter(Boolean).join(' ')} role="alert">
      <span className={styles.badge} aria-hidden="true">
        <Icon name="danger" />
      </span>

      <h2 className={styles.title}>{title}</h2>
      <p className={styles.text}>{children}</p>

      {actions === undefined ? null : <div className={styles.actions}>{actions}</div>}
    </div>
  );
}
