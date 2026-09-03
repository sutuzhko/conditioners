import { crmContent as texts } from '@/features/crm-calendar';
import { Skeleton } from '@/shared/ui';

import styles from './page.module.css';

/**
 * Календарь работ: шапка настоящая, панель инструментов и сетка — заготовками
 * по замеру готовой страницы (issue #334). Панель на 390 переносится в
 * несколько рядов, и её высота задана по ширине экрана.
 */
export default function CrmLoading() {
  return (
    <div className={styles.page} aria-busy="true">
      <header className={styles.header}>
        <h1 className={styles.title}>{texts.title}</h1>
        <p className={styles.lead}>{texts.lead}</p>
      </header>

      <div className={styles.calendar}>
        <Skeleton variant="block" className={styles.navSkeleton} />
        <Skeleton variant="block" className={styles.gridSkeleton} />
      </div>
    </div>
  );
}
