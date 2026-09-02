import Link from 'next/link';

import { TEAM_NEW_PATH, staffManagerContent as texts } from '@/features/staff-manager';
import { buttonClassName } from '@/shared/ui';
import { RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Монтажники: шапка настоящая, карточки людей — заготовками по замеру
 * готовой страницы (issue #334).
 */
export default function TeamLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: TEAM_NEW_PATH }}>
            {texts.addOpen}
          </Link>
        </div>

        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <RowsSkeleton rows={4} className={styles.rowSkeleton} />
    </div>
  );
}
