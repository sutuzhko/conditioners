import type { AdminRole } from '@/entities/staff/model';
import { ButtonLink } from '@/shared/ui';

import { PANEL_NOT_FOUND_CONTENT as t, type PanelNotFoundKind } from './not-found-content';
import styles from './not-found.module.css';

/**
 * Видимая часть страниц «не найдено» в панели — issue #631.
 *
 * Отделена от самих границ ради истории Storybook: граница читает сессию, а
 * история обязана показать оба случая и оба выхода, не поднимая ни базы, ни
 * сессии.
 */
export function PanelNotFoundView({ kind, role }: { kind: PanelNotFoundKind; role: AdminRole }) {
  const text = t[kind];
  const exit = role === 'owner' ? t.owner : t.installer;

  return (
    <section className={styles.page}>
      <p className={styles.code}>{t.code}</p>
      <h1 className={styles.title}>{text.title}</h1>
      <p className={styles.lead}>{text.lead}</p>

      <ButtonLink href={exit.href} size="lg" className={styles.action}>
        {exit.label}
      </ButtonLink>
    </section>
  );
}
