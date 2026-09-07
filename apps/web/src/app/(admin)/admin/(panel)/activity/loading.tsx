import { activityLogContent as texts } from '@/features/activity-log';

import { ActivitySkeleton } from './ActivitySkeleton';
import styles from './page.module.css';

/**
 * Журнал: шапка настоящая, заготовка — только у списка (issue #334). Статичная
 * часть страницы рисуется как есть: только так её высота совпадает при любом
 * переносе строк.
 */
export default function ActivityLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <ActivitySkeleton />
    </div>
  );
}
