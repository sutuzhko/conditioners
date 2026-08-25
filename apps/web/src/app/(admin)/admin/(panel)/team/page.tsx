import type { Metadata } from 'next';

import { StaffList, staffManagerContent as texts } from '@/features/staff-manager';
import { requireOwnerPage } from '@/server/guards';
import { list } from '@/server/repo/admin-users';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Команда.
 *
 * Читаем `repo` напрямую, а не своим же HTTP-запросом к `/api/admin/staff`:
 * страница и так серверная, лишний круг через сеть — лишний способ отказать.
 */
export default async function AdminTeamPage() {
  /* Раздел владельца: проверка до чтения данных (ADR-095). */
  await requireOwnerPage();

  const staff = await list();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <StaffList staff={staff} />
    </div>
  );
}
