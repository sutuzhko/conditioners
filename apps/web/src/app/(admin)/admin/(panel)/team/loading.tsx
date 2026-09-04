import Link from 'next/link';

import { TEAM_NEW_PATH, staffManagerContent as texts } from '@/features/staff-manager';
import { Skeleton, buttonClassName } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Монтажники: шапка настоящая, строка счёта, плитки показателей и таблица
 * команды — заготовками по замеру готовой страницы (issue #334).
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

        {/* Счёт смены приходит из базы: под строку резервируется её высота. */}
        <Skeleton variant="text" width="14ch" />
      </header>

      {/* Ряд плиток и таблица команды одним блоком каждый: список стал
          таблицей (issue #602), и четыре карточки на его месте обещали бы
          другую геометрию. */}
      <Skeleton variant="block" className={styles.tilesSkeleton} />
      <Skeleton variant="block" className={styles.rowSkeleton} />
    </div>
  );
}
