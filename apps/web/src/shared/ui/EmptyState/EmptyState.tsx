import type { ReactNode } from 'react';

import { Icon, type IconName } from '../Icon';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  /** Значок раздела: заявки, наряды, склад. Декоративен — смысл несёт текст. */
  readonly icon: IconName;
  /** Что именно пусто: «Заявок пока нет», «Ничего не найдено». */
  readonly title: string;
  /**
   * Почему пусто и что с этим делать. 🔴 Обязателен: пустой экран без причины
   * читается как поломка, и человек начинает жать «Обновить» вместо того,
   * чтобы завести первую запись или снять фильтр.
   */
  readonly children: ReactNode;
  /** Следующий шаг: «Проверить уведомления», «Сбросить фильтры». */
  readonly action?: ReactNode | undefined;
  readonly className?: string | undefined;
}

/**
 * Пустое состояние блока панели (issue #335).
 *
 * 🔴 Один компонент на два случая, а не два компонента: анатомия у них одна —
 * значок в круге, заголовок, объяснение, действие. Различаются только текст и
 * действие, и различать их обязан вызывающий код, который один и знает,
 * отсёк ли записи фильтр.
 *
 * «Заявок пока нет» и «Ничего не найдено» выглядят одинаково пустыми, а шаги
 * у них противоположные: в первом случае надо проверить, доходят ли заявки, во
 * втором — снять фильтр. Один текст на оба случая заводит владельца в тупик.
 *
 * Значок несёт `aria-hidden`: он повторяет то, что уже сказано заголовком, а
 * озвучка не должна произносить это дважды.
 */
export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div className={[styles.box, className].filter(Boolean).join(' ')}>
      <span className={styles.badge} aria-hidden="true">
        <Icon name={icon} />
      </span>

      {/* 🔴 Заголовок, а не абзац: читалка ходит по заголовкам, и пустое
          состояние обязано быть остановкой в этом обходе — иначе человек,
          листающий разделы озвучкой, не узнает, что раздел пуст. */}
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.text}>{children}</p>

      {action === undefined ? null : <div className={styles.action}>{action}</div>}
    </div>
  );
}
