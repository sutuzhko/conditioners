import Link from 'next/link';

import { CLIENT_NEW_PATH, clientManagerContent as texts } from '@/features/client-manager';
import { Skeleton, buttonClassName } from '@/shared/ui';
import { RowsSkeleton } from '@/widgets/admin-shell';

import styles from './page.module.css';

/**
 * Клиенты: шапка настоящая, карточка поиска и список — заготовками по замеру
 * готовой страницы (issue #334). Шапка не зависит от данных, и только
 * настоящая шапка даёт ту же высоту при любом переносе строк.
 */
export default function ClientsLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <div className={styles.headline}>
          <h1 className={styles.title}>{texts.title}</h1>

          <Link className={buttonClassName({ size: 'sm' })} href={{ pathname: CLIENT_NEW_PATH }}>
            {texts.addOpen}
          </Link>
        </div>

        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <Skeleton variant="block" className={styles.searchSkeleton} />
      <RowsSkeleton rows={4} className={styles.rowSkeleton} />
    </div>
  );
}
