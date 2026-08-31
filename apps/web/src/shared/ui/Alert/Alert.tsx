import type { ReactNode } from 'react';

import { Icon, type IconName } from '../Icon';
import styles from './Alert.module.css';

/**
 * Краски — из закрытого словаря панели (ADR-194). Седьмая не заводится:
 * вместо неё уточняется текст.
 */
export type AlertTone = 'info' | 'success' | 'warning' | 'danger';

export interface AlertProps {
  readonly tone?: AlertTone | undefined;
  /** Заголовок сообщения. Без него алерт — просто абзац в рамке. */
  readonly title: string;
  readonly children?: ReactNode | undefined;
  /** Действие справа или снизу: «Повторить», «Настроить роли». */
  readonly action?: ReactNode | undefined;
  /**
   * Срочность для озвучки. `assertive` перебивает то, что читалка говорит
   * сейчас, и годится только сообщению об ошибке действия, которое человек
   * только что сделал. Предупреждение о ролях, висящее на странице с загрузки,
   * ждёт своей очереди.
   */
  readonly live?: 'polite' | 'assertive' | 'off' | undefined;
  readonly className?: string | undefined;
}

const TONE_ICON: Readonly<Record<AlertTone, IconName>> = {
  info: 'pulse',
  success: 'check',
  warning: 'danger',
  danger: 'danger',
};

/**
 * Алерт: предупреждения о ролях, объяснения ошибок (issue #332).
 *
 * 🔴 Значок декоративен и несёт `aria-hidden`. Смысл несут заголовок и текст:
 * четыре краски различает не всякий глаз, а на чёрно-белой печати наряда они
 * совпадают все — то же правило, что у плашки статуса (DESIGN_BRIEF §14).
 *
 * 🔴 Роль зависит от тона, а не ставится одна на всех. `alert` у ошибки —
 * читалка объявит её сама; `status` у остальных — они не перебивают. Роль
 * `alert` на предупреждении, висящем с загрузки страницы, заставляет читалку
 * начинать с него каждый раз.
 */
export function Alert({ tone = 'info', title, children, action, live, className }: AlertProps) {
  const role = tone === 'danger' ? 'alert' : 'status';
  const liveness = live ?? (tone === 'danger' ? 'assertive' : 'polite');

  return (
    <div
      className={[styles.alert, styles[tone], className].filter(Boolean).join(' ')}
      role={role}
      aria-live={liveness}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon name={TONE_ICON[tone]} size={18} />
      </span>
      <div className={styles.body}>
        <p className={styles.title}>{title}</p>
        {children === undefined ? null : <div className={styles.text}>{children}</div>}
      </div>
      {action === undefined ? null : <div className={styles.action}>{action}</div>}
    </div>
  );
}
