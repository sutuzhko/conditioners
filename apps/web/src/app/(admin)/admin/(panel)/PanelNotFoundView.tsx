import type { AdminRole } from '@/entities/staff/model';
import { ButtonLink } from '@/shared/ui';

import { PANEL_NOT_FOUND_CONTENT as t } from './not-found-content';
import styles from './not-found.module.css';

/**
 * Видимая часть страницы «не найдено» — issue #631.
 *
 * Отделена от самой границы `not-found.tsx` ради истории Storybook: граница
 * читает сессию из базы, а история обязана показать оба выхода — владельца и
 * монтажника — не поднимая ни базы, ни сессии.
 */
export function PanelNotFoundView({ role }: { role: AdminRole }) {
  const exit = role === 'owner' ? t.owner : t.installer;

  return (
    <section className={styles.page}>
      <p className={styles.code}>{t.code}</p>
      <h1 className={styles.title}>{t.title}</h1>
      <p className={styles.lead}>{t.lead}</p>

      <ButtonLink href={exit.href} size="lg" className={styles.action}>
        {exit.label}
      </ButtonLink>
    </section>
  );
}
