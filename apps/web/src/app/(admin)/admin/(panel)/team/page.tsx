import type { Metadata } from 'next';
import Link from 'next/link';

import { StaffList, TEAM_NEW_PATH, staffManagerContent as texts } from '@/features/staff-manager';
import { requireOwnerPage } from '@/server/guards';
import { list } from '@/server/repo/admin-users';
import { buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

export const metadata: Metadata = { title: texts.title };

export const dynamic = 'force-dynamic';

/**
 * Команда.
 *
 * 🔴 Заведение монтажника ушло в окно с собственным адресом (ADR-117):
 * свёрнутая форма над списком уводила карточки вниз ровно тогда, когда на них
 * смотрят. Кнопка «Добавить» — ссылка, а не состояние: окно открывается адресом.
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
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: TEAM_NEW_PATH }}>
            {texts.addOpen}
          </Link>
        </div>

        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <StaffList staff={staff} />
    </div>
  );
}
